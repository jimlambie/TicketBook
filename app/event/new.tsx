import { useState, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useLogEvent, useUploadMedia } from '@/hooks/useEvents'
import { useTagFriend } from '@/hooks/useAttendees'
import { useCreateSetlist } from '@/hooks/useCreateSetlist'
import { useSetlistFm } from '@/hooks/useSetlistFm'
import { useAuthStore } from '@/stores/authStore'
import { PREMIUM_ENABLED } from '@/lib/features'
import {
  saveDraft, loadDraft, clearDraft, hasDraft,
  DRAFT_DEFAULTS,
} from '@/lib/draft'
import { C } from '@/constants/design'
import ProgressBar from '@/components/event-form/ProgressBar'
import StepType from '@/components/event-form/StepType'
import StepArtist from '@/components/event-form/StepArtist'
import StepVenue from '@/components/event-form/StepVenue'
import StepWhen from '@/components/event-form/StepWhen'
import StepMedia from '@/components/event-form/StepMedia'
import StepSetlist from '@/components/event-form/StepSetlist'
import StepSportDetails from '@/components/event-form/StepSportDetails'
import StepReview from '@/components/event-form/StepReview'
import StepPublish from '@/components/event-form/StepPublish'
import type { DraftState } from '@/lib/draft'
import type { EventType } from '@/lib/database.types'

function getStepSequence(type: EventType | null): number[] {
  if (!type) {
    return [1]
  }
  if (type === 'other') {
    return [1, 2, 3, 4, 5, 7, 8]
  }
  return [1, 2, 3, 4, 5, 6, 7, 8]
}

function buildTitle(draft: DraftState): string {
  if (!draft.type) {
    return ''
  }
  if (draft.type === 'sport') {
    return draft.secondary.trim()
      ? `${draft.primary.trim()} vs ${draft.secondary.trim()}`
      : draft.primary.trim()
  }
  if (draft.type === 'concert') {
    return draft.tourName.trim() || draft.primary.trim()
  }
  return draft.primary.trim()
}

export default function NewEventScreen() {
  const [draft, setDraft] = useState<DraftState>(DRAFT_DEFAULTS)
  const [savedDraftExists, setSavedDraftExists] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const { supabaseUser, profile } = useAuthStore()
  const isPremium = PREMIUM_ENABLED && profile?.plan === 'premium'
  const logEvent = useLogEvent()
  const uploadMedia = useUploadMedia()
  const createSetlist = useCreateSetlist()
  const tagFriend = useTagFriend()

  const isConcertOrFestival = draft.type === 'concert' || draft.type === 'festival'
  const { data: fmResults = [], isFetching: fmFetching, isError: fmError } = useSetlistFm(
    isConcertOrFestival ? draft.artistMbid : null,
    isConcertOrFestival ? draft.date : null,
  )

  useEffect(() => {
    hasDraft().then(setSavedDraftExists)
  }, [])

  function updateDraft(partial: Partial<DraftState>) {
    setDraft(prev => {
      const next = { ...prev, ...partial }
      saveDraft(next).catch(() => {})
      return next
    })
  }

  const sequence = getStepSequence(draft.type)
  const totalSteps = sequence.length
  const currentPosition = sequence.indexOf(draft.step) + 1

  function goNext() {
    const idx = sequence.indexOf(draft.step)
    const nextStep = sequence[idx + 1]
    if (nextStep !== undefined) {
      updateDraft({ step: nextStep })
    }
  }

  function goBack() {
    const idx = sequence.indexOf(draft.step)
    if (idx <= 0) {
      router.back()
      return
    }
    const prevStep = sequence[idx - 1]
    updateDraft({ step: prevStep })
  }

  async function handlePublish() {
    if (!draft.type) {
      return
    }
    setIsPublishing(true)
    setPublishError(null)
    try {
      const event = await logEvent.mutateAsync({
        type: draft.type,
        title: buildTitle(draft),
        artistName: (draft.type === 'concert' || draft.type === 'festival') ? draft.primary.trim() || null : null,
        artistMbid: draft.artistMbid,
        venueId: draft.venueId,
        venueName: draft.venueName.trim() || null,
        venueCountry: draft.country.trim() || null,
        venueCountryCode: draft.countryCode || null,
        eventDate: draft.date,
        city: draft.city.trim() || null,
        visibility: draft.visibility,
        rating: draft.rating > 0 ? draft.rating : null,
        reviewText: draft.reviewText.trim() || null,
        sportDetails: draft.type === 'sport' ? {
          home_team: draft.primary.trim(),
          away_team: draft.secondary.trim(),
          home_score: draft.homeScore.trim() ? parseInt(draft.homeScore, 10) : null,
          away_score: draft.awayScore.trim() ? parseInt(draft.awayScore, 10) : null,
          competition: draft.competition.trim() || null,
          season: draft.season.trim() || null,
          lineups: (draft.homeLineup.length > 0 || draft.awayLineup.length > 0)
            ? {
                home: draft.homeLineup.filter(Boolean),
                away: draft.awayLineup.filter(Boolean),
              }
            : null,
        } : undefined,
      })

      const eventId = event.id

      if (draft.ticketImageUri) {
        try {
          await uploadMedia.mutateAsync({
            eventId,
            uri: draft.ticketImageUri,
            type: 'ticket',
            mimeType: draft.ticketMimeType || 'image/jpeg',
          })
        } catch {
          // stale URI on relaunch — skip, don't abort publish
        }
      }

      for (const photo of draft.photos) {
        try {
          await uploadMedia.mutateAsync({
            eventId,
            uri: photo.uri,
            type: 'photo',
            mimeType: photo.mimeType || 'image/jpeg',
          })
        } catch {
          // skip stale URIs
        }
      }

      if (draft.videoUri) {
        try {
          await uploadMedia.mutateAsync({
            eventId,
            uri: draft.videoUri,
            type: 'video',
            mimeType: 'video/mp4',
          })
        } catch {
          // skip stale URI
        }
      }

      if (draft.songs.length > 0) {
        await createSetlist.mutateAsync({
          eventId,
          source: draft.setlistSource === 'setlist_fm' ? 'setlist_fm' : 'manual',
          setlistFmId: draft.setlistFmId,
          songs: draft.songs,
        })
      }

      if (draft.taggedFriendIds.length > 0 && supabaseUser) {
        await Promise.all(
          draft.taggedFriendIds.map(friendId =>
            tagFriend.mutateAsync({
              eventId,
              taggedUserId: friendId,
              taggedByUserId: supabaseUser.id,
            })
          )
        )
      }

      clearDraft()
      router.replace({
        pathname: '/event/success',
        params: {
          stubNumber: String(event.stub_number ?? 0),
          artist: buildTitle(draft),
          date: draft.date,
          type: draft.type ?? 'other',
          city: draft.city || draft.venueCity,
        },
      })
    } catch (err) {
      setPublishError((err as Error)?.message ?? 'something went wrong')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {draft.step > 1 && (
        <ProgressBar currentStep={currentPosition} totalSteps={totalSteps} />
      )}

      {draft.step === 1 && (
        <StepType
          onSelect={(type) => {
            clearDraft()
            setSavedDraftExists(false)
            const freshDraft = { ...DRAFT_DEFAULTS, type, step: 2 }
            setDraft(freshDraft)
            saveDraft(freshDraft).catch(() => {})
          }}
          onClose={() => router.back()}
          hasDraft={savedDraftExists}
          onResumeDraft={() => {
            loadDraft().then(saved => {
              if (saved) {
                setDraft(saved)
                setSavedDraftExists(false)
              }
            })
          }}
          onDiscardDraft={() => {
            clearDraft()
            setSavedDraftExists(false)
          }}
        />
      )}

      {draft.step === 2 && draft.type && (
        <StepArtist
          type={draft.type}
          primary={draft.primary}
          onChangePrimary={(text) => updateDraft({ primary: text, artistMbid: null })}
          artistMbid={draft.artistMbid}
          onSelectArtist={(name, mbid) => updateDraft({ primary: name, artistMbid: mbid })}
          secondary={draft.secondary}
          onChangeSecondary={(text) => updateDraft({ secondary: text })}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {draft.step === 3 && (
        <StepWhen
          date={draft.date}
          onChangeDate={(iso) => updateDraft({ date: iso })}
          city={draft.city}
          onChangeCity={(text) => updateDraft({ city: text })}
          country={draft.country}
          onChangeCountry={(text) => updateDraft({ country: text })}
          countryCode={draft.countryCode}
          onSelectCountry={(name, code) => updateDraft({ country: name, countryCode: code })}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {draft.step === 4 && (
        <StepVenue
          type={draft.type}
          venueId={draft.venueId}
          venueName={draft.venueName}
          setlistFmResults={fmResults}
          onSelectVenue={({ id, name, city, countryCode }) => {
            updateDraft({
              venueId: id,
              venueName: name,
              venueCity: city,
              venueCountryCode: countryCode,
              city: city || draft.city,
              countryCode: countryCode || draft.countryCode,
            })
          }}
          onTypeVenueName={(name) => updateDraft({ venueId: null, venueName: name })}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {draft.step === 5 && (
        <StepMedia
          ticketImageUri={draft.ticketImageUri}
          ticketMimeType={draft.ticketMimeType}
          onSetTicketImage={(uri, mimeType) => updateDraft({ ticketImageUri: uri, ticketMimeType: mimeType })}
          photos={draft.photos}
          onSetPhotos={(photos) => updateDraft({ photos })}
          videoUri={draft.videoUri}
          onSetVideo={(uri) => updateDraft({ videoUri: uri })}
          isPremium={isPremium}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {draft.step === 6 && draft.type === 'sport' && (
        <StepSportDetails
          homeTeam={draft.primary}
          awayTeam={draft.secondary}
          homeScore={draft.homeScore}
          onChangeHomeScore={(v) => updateDraft({ homeScore: v })}
          awayScore={draft.awayScore}
          onChangeAwayScore={(v) => updateDraft({ awayScore: v })}
          competition={draft.competition}
          onChangeCompetition={(v) => updateDraft({ competition: v })}
          season={draft.season}
          onChangeSeason={(v) => updateDraft({ season: v })}
          homeLineup={draft.homeLineup}
          onChangeHomeLineup={(lineup) => updateDraft({ homeLineup: lineup })}
          awayLineup={draft.awayLineup}
          onChangeAwayLineup={(lineup) => updateDraft({ awayLineup: lineup })}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {draft.step === 6 && (draft.type === 'concert' || draft.type === 'festival') && (
        <StepSetlist
          artistMbid={draft.artistMbid}
          fmResults={fmResults}
          fmFetching={fmFetching}
          fmError={fmError}
          setlistSource={draft.setlistSource}
          onChangeSource={(source) => updateDraft({ setlistSource: source })}
          setlistFmId={draft.setlistFmId}
          onSelectSetlistFm={(id, songs, tourName) => updateDraft({
            setlistFmId: id,
            songs,
            setlistSource: 'setlist_fm',
            tourName: tourName ?? draft.tourName,
          })}
          songs={draft.songs}
          onChangeSongs={(songs) => updateDraft({ songs })}
          isPremium={isPremium}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {draft.step === 7 && (
        <StepReview
          rating={draft.rating}
          onChangeRating={(r) => updateDraft({ rating: r })}
          reviewText={draft.reviewText}
          onChangeReviewText={(t) => updateDraft({ reviewText: t })}
          tourName={isConcertOrFestival ? draft.tourName : undefined}
          onChangeTourName={(t) => updateDraft({ tourName: t })}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {draft.step === 8 && (
        <StepPublish
          visibility={draft.visibility}
          onChangeVisibility={(v) => updateDraft({ visibility: v })}
          taggedFriendIds={draft.taggedFriendIds}
          onChangeTaggedFriendIds={(ids) => updateDraft({ taggedFriendIds: ids })}
          onPublish={handlePublish}
          onBack={goBack}
          isPublishing={isPublishing}
          publishError={publishError}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
})
