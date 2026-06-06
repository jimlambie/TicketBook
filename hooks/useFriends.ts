import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { User, Friendship } from '@/lib/database.types'

export type FriendshipRelation = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export type UserWithStatus = User & {
  friendshipId?: string
  friendshipRelation: FriendshipRelation
}

export type FriendRequestRow = Friendship & {
  requester: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

const friendKeys = {
  all: ['friends'] as const,
  list: (userId: string) => [...friendKeys.all, 'list', userId] as const,
  requests: (userId: string) => [...friendKeys.all, 'requests', userId] as const,
}

// ============================================================
// SEARCH USERS
// ============================================================

export function useSearchUsers(query: string): { results: UserWithStatus[]; isLoading: boolean } {
  const { supabaseUser } = useAuthStore()
  const [results, setResults] = useState<UserWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    const q = query.trim()
    if (q.length < 2 || !supabaseUser) {
      setResults([])
      return
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .neq('id', supabaseUser.id)
          .ilike('username', `%${q}%`)
          .limit(12)

        if (!users?.length) {
          setResults([])
          return
        }

        const { data: friendships } = await supabase
          .from('friendships')
          .select('*')
          .or(`requester_id.eq.${supabaseUser.id},addressee_id.eq.${supabaseUser.id}`)

        const friendshipMap = new Map<string, Friendship>()
        for (const f of friendships ?? []) {
          const otherId =
            f.requester_id === supabaseUser.id ? f.addressee_id : f.requester_id
          friendshipMap.set(otherId, f)
        }

        setResults(
          users.map(u => {
            const f = friendshipMap.get(u.id)
            let friendshipRelation: FriendshipRelation = 'none'
            if (f) {
              if (f.status === 'accepted') {
                friendshipRelation = 'accepted'
              } else if (f.status === 'pending') {
                friendshipRelation =
                  f.requester_id === supabaseUser.id ? 'pending_sent' : 'pending_received'
              }
            }
            return { ...u, friendshipId: f?.id, friendshipRelation }
          })
        )
      } finally {
        setIsLoading(false)
      }
    }, 400)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [query, supabaseUser])

  return { results, isLoading }
}

// ============================================================
// MY ACCEPTED FRIENDS
// ============================================================

export function useFriends() {
  const { supabaseUser } = useAuthStore()

  return useQuery({
    queryKey: friendKeys.list(supabaseUser?.id ?? ''),
    queryFn: async () => {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id')
        .or(`requester_id.eq.${supabaseUser!.id},addressee_id.eq.${supabaseUser!.id}`)
        .eq('status', 'accepted')

      if (error) {
        throw error
      }
      if (!friendships?.length) {
        return [] as UserWithStatus[]
      }

      const friendMap = new Map<string, string>()
      for (const f of friendships) {
        const friendId =
          f.requester_id === supabaseUser!.id ? f.addressee_id : f.requester_id
        friendMap.set(friendId, f.id)
      }

      const friendIds = [...friendMap.keys()]

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', friendIds)

      if (usersError) {
        throw usersError
      }

      return (users ?? []).map(u => ({
        ...u,
        friendshipId: friendMap.get(u.id),
        friendshipRelation: 'accepted' as FriendshipRelation,
      }))
    },
    enabled: !!supabaseUser,
  })
}

// ============================================================
// INCOMING PENDING REQUESTS
// ============================================================

export function useFriendRequests() {
  const { supabaseUser } = useAuthStore()

  return useQuery({
    queryKey: friendKeys.requests(supabaseUser?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('addressee_id', supabaseUser!.id)
        .eq('status', 'pending')

      if (error) {
        throw error
      }
      if (!data?.length) {
        return [] as FriendRequestRow[]
      }

      const requesterIds = data.map(f => f.requester_id)
      const { data: users } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', requesterIds)

      const userMap = new Map((users ?? []).map(u => [u.id, u]))

      return data.map(f => ({
        ...f,
        requester: userMap.get(f.requester_id) ?? {
          id: f.requester_id,
          username: 'unknown',
          display_name: null,
          avatar_url: null,
        },
      })) as FriendRequestRow[]
    },
    enabled: !!supabaseUser,
  })
}

// ============================================================
// MUTATIONS
// ============================================================

export function useSendFriendRequest() {
  const queryClient = useQueryClient()
  const { supabaseUser } = useAuthStore()

  return useMutation({
    mutationFn: async (addresseeId: string) => {
      const { error } = await supabase.from('friendships').insert({
        requester_id: supabaseUser!.id,
        addressee_id: addresseeId,
        status: 'pending',
      })
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.all })
    },
  })
}

export function useRespondToRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'blocked' })
        .eq('id', id)
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.all })
    },
  })
}

export function useRemoveFriend() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.all })
    },
  })
}
