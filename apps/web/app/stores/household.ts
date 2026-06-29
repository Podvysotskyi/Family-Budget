import type { Household, HouseholdMember } from '~/types/households'

const { createAbortController } = useAbortController()
const { addErrorToast } = useAppToast()
const { get, patch } = useStoreApi()
const { waitUntil } = useWaitUntil()

export const useHouseholdStore = defineStore('household', {
  state: () => ({
    abortController: null as AbortController | null,
    household: null as Household | null,
    householdMembers: [] as HouseholdMember[],
    loading: false,
    saving: false
  }),

  getters: {
    householdId: state => state.household?.householdId || '',

    householdName: state => state.household?.householdName || '',

    isLoaded: state => state.household != null,

    isLoading: state => state.loading,

    isSaving: state => state.saving,

    members: state => state.householdMembers,

    membersCount: state => state.householdMembers.length
  },

  actions: {
    async fetchHousehold() {
      if (this.loading) {
        await waitUntil(() => !this.loading)

        return
      }

      this.loading = true

      try {
        const response = await get<{
          household: Household
          members: HouseholdMember[]
        }>('/household')

        this.household = response.household
        this.householdMembers = response.members
      } catch {
        addErrorToast('Household could not be loaded')
      } finally {
        this.loading = false
      }
    },

    async updateHouseholdName(name: string) {
      if (!this.household) {
        return false
      }

      const abortController = createAbortController(this)
      this.saving = true

      try {
        const response = await patch<{
          household: Household
        }>(`/households/${this.householdId}`, {
          name
        }, {
          signal: abortController.signal
        })

        this.household = response.household
        this.abortController = null

        return true
      } catch (error) {
        if (!abortController.signal.aborted) {
          addErrorToast('Household name could not be saved')
        }

        return false
      } finally {
        if (!abortController.signal.aborted) {
          this.saving = false
        }
      }
    }
  }
})
