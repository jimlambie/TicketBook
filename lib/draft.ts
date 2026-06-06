import AsyncStorage from '@react-native-async-storage/async-storage'
import type { EventType, Visibility } from './database.types'

const DRAFT_KEY = '@ticketbook/event_draft'

export type Song = {
  position: number
  title: string
  note?: string
  encore: boolean
}

export type Photo = {
  uri: string
  mimeType: string
}

export type DraftState = {
  step: number
  type: EventType | null
  primary: string
  artistMbid: string | null
  secondary: string
  tourName: string
  venueId: string | null
  venueName: string
  venueCity: string
  venueCountryCode: string
  date: string
  city: string
  country: string
  countryCode: string
  ticketImageUri: string | null
  ticketMimeType: string
  photos: Photo[]
  videoUri: string | null
  setlistSource: 'setlist_fm' | 'manual'
  setlistFmId: string | null
  songs: Song[]
  competition: string
  season: string
  homeScore: string
  awayScore: string
  homeLineup: string[]
  awayLineup: string[]
  rating: number
  visibility: Visibility
  reviewText: string
  taggedFriendIds: string[]
}

export const DRAFT_DEFAULTS: DraftState = {
  step: 1,
  type: null,
  primary: '',
  artistMbid: null,
  secondary: '',
  tourName: '',
  venueId: null,
  venueName: '',
  venueCity: '',
  venueCountryCode: '',
  date: new Date().toISOString().slice(0, 10),
  city: '',
  country: '',
  countryCode: '',
  ticketImageUri: null,
  ticketMimeType: 'image/jpeg',
  photos: [],
  videoUri: null,
  setlistSource: 'setlist_fm',
  setlistFmId: null,
  songs: [],
  competition: '',
  season: '',
  homeScore: '',
  awayScore: '',
  homeLineup: [],
  awayLineup: [],
  rating: 0,
  visibility: 'public',
  reviewText: '',
  taggedFriendIds: [],
}

export async function saveDraft(draft: DraftState): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export async function loadDraft(): Promise<DraftState | null> {
  const raw = await AsyncStorage.getItem(DRAFT_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as DraftState
  } catch {
    return null
  }
}

export async function clearDraft(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY)
}

export async function hasDraft(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(DRAFT_KEY)
  return raw !== null
}
