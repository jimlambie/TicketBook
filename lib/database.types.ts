export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type EventType = 'concert' | 'sport' | 'festival' | 'other'
export type Visibility = 'public' | 'friends' | 'private'
export type MediaType = 'ticket' | 'photo' | 'video' | 'setlist' | 'document'
export type ModerationStatus = 'pending' | 'approved' | 'rejected'
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'
export type AttendeeStatus = 'pending' | 'confirmed' | 'declined'
export type SetlistSource = 'user_upload' | 'setlist_fm' | 'manual'
export type PlanType = 'free' | 'premium'

export interface ArchiveInsights {
  total_shows: number
  years_active: number[]
  longest_gap: {
    days: number
    from_date: string
    to_date: string
  } | null
  artist_streak: {
    artist_name: string
    start_year: number
    end_year: number
    length: number
  } | null
  busiest_month: {
    month: string
    month_num: number
    count: number
  } | null
  highest_rated_show: {
    title: string
    artist_name: string | null
    venue_name: string | null
    rating: number
    event_date: string
  } | null
  cities_count: number
  countries_count: number
}

export interface YearInReview {
  year: number | null
  years_active: number[]
  total_shows?: number
  prev_year_total?: number
  top_artist?: {
    name: string
    count: number
  } | null
  top_venue?: {
    name: string
    count: number
  } | null
  highest_rated_show?: {
    title: string
    artist_name: string | null
    venue_name: string | null
    rating: number
    event_date: string
  } | null
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          plan: PlanType
          privacy_default: Visibility
          push_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          plan?: PlanType
          privacy_default?: Visibility
          push_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
      }
      artists: {
        Row: {
          id: string
          name: string
          slug: string
          spotify_id: string | null
          musicbrainz_id: string | null
          genre: string | null
          image_url: string | null
          aliases: string[]
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          spotify_id?: string | null
          musicbrainz_id?: string | null
          genre?: string | null
          image_url?: string | null
          aliases?: string[]
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['artists']['Insert']>
        Relationships: []
      }
      venues: {
        Row: {
          id: string
          name: string
          slug: string
          city: string
          country: string
          country_code: string | null
          lat: number | null
          lng: number | null
          capacity: number | null
          created_by: string | null
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          city: string
          country?: string
          country_code?: string | null
          lat?: number | null
          lng?: number | null
          capacity?: number | null
          created_by?: string | null
          verified?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['venues']['Insert']>
        Relationships: []
      }
      events: {
        Row: {
          id: string
          user_id: string
          type: EventType
          title: string
          artist_id: string | null
          artist_name: string | null
          venue_id: string | null
          venue_name: string | null
          event_date: string
          city: string | null
          country_code: string | null
          visibility: Visibility
          rating: number | null
          review_text: string | null
          notes: string | null
          stub_number: number | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: EventType
          title: string
          artist_id?: string | null
          artist_name?: string | null
          venue_id?: string | null
          venue_name?: string | null
          event_date: string
          city?: string | null
          country_code?: string | null
          visibility: Visibility
          rating?: number | null
          review_text?: string | null
          notes?: string | null
          stub_number?: number | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: []
      }
      sport_details: {
        Row: {
          id: string
          event_id: string
          home_team: string | null
          away_team: string | null
          home_score: number | null
          away_score: number | null
          competition: string | null
          season: string | null
          lineups: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sport_details']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['sport_details']['Insert']>
        Relationships: []
      }
      event_media: {
        Row: {
          id: string
          event_id: string
          user_id: string
          type: MediaType
          storage_path: string
          thumbnail_path: string | null
          file_size_bytes: number | null
          mime_type: string | null
          ocr_extracted_text: string | null
          moderation_status: ModerationStatus
          moderation_reason: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          type: MediaType
          storage_path: string
          thumbnail_path?: string | null
          file_size_bytes?: number | null
          mime_type?: string | null
          ocr_extracted_text?: string | null
          moderation_status: ModerationStatus
          moderation_reason?: string | null
          sort_order: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['event_media']['Insert']>
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: FriendshipStatus
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['friendships']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['friendships']['Insert']>
        Relationships: []
      }
      event_attendees: {
        Row: {
          id: string
          event_id: string
          tagged_by_user_id: string
          tagged_user_id: string
          status: AttendeeStatus
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['event_attendees']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['event_attendees']['Insert']>
        Relationships: []
      }
      user_stats: {
        Row: {
          id: string
          user_id: string
          dimension: string
          key: string
          label: string
          count: number
          last_event_date: string | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_stats']['Row'], 'id'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['user_stats']['Insert']>
        Relationships: []
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          type: string
          label: string
          metadata: Json
          awarded_at: string
        }
        Insert: Omit<Database['public']['Tables']['achievements']['Row'], 'id' | 'awarded_at'> & {
          id?: string
          awarded_at?: string
        }
        Update: Partial<Database['public']['Tables']['achievements']['Insert']>
        Relationships: []
      }
      setlists: {
        Row: {
          id: string
          event_id: string
          source: SetlistSource
          setlist_fm_id: string | null
          songs: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          source: SetlistSource
          setlist_fm_id?: string | null
          songs: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['setlists']['Insert']>
        Relationships: []
      }
    }
    Views: {
      accepted_friends: {
        Row: {
          user_id: string
          friend_id: string
        }
        Relationships: []
      }
      events_feed: {
        Row: Database['public']['Tables']['events']['Row'] & {
          artist_canonical_name: string | null
          artist_slug: string | null
          artist_image_url: string | null
          venue_canonical_name: string | null
          venue_slug: string | null
          venue_city: string | null
          venue_country_code: string | null
          attendee_count: number
          sport_details: {
            home_team: string | null
            away_team: string | null
            home_score: number | null
            away_score: number | null
            competition: string | null
            season: string | null
            lineups: Json | null
          } | null
        }
        Relationships: []
      }
      leaderboard_total: {
        Row: {
          user_id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          total_events: number
          last_event_date: string | null
          rank: number
        }
        Relationships: []
      }
    }
    Functions: {
      are_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      refresh_user_stats: {
        Args: { p_user_id: string }
        Returns: void
      }
      evaluate_achievements: {
        Args: { p_user_id: string }
        Returns: void
      }
      get_archive_insights: {
        Args: Record<string, never>
        Returns: ArchiveInsights
      }
      get_year_in_review: {
        Args: { p_year?: number | null }
        Returns: YearInReview
      }
    }
    Enums: {
      event_type: EventType
      visibility: Visibility
      media_type: MediaType
      moderation_status: ModerationStatus
      friendship_status: FriendshipStatus
      attendee_status: AttendeeStatus
      setlist_source: SetlistSource
      plan_type: PlanType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type User = Database['public']['Tables']['users']['Row']
export type Artist = Database['public']['Tables']['artists']['Row']
export type Venue = Database['public']['Tables']['venues']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type SportDetails = Database['public']['Tables']['sport_details']['Row']
export type EventMedia = Database['public']['Tables']['event_media']['Row']
export type Friendship = Database['public']['Tables']['friendships']['Row']
export type EventAttendee = Database['public']['Tables']['event_attendees']['Row']
export type UserStat = Database['public']['Tables']['user_stats']['Row']
export type Achievement = Database['public']['Tables']['achievements']['Row']
export type EventFeedRow = Database['public']['Views']['events_feed']['Row']
export type Setlist = Database['public']['Tables']['setlists']['Row']
