export function useAppToast() {
  function addSuccessToast(title: string) {
    if (import.meta.client) {
      useToast().add({
        title,
        color: 'success',
        icon: 'i-lucide-circle-check'
      })
    } else {
      console.log(title)
    }
  }

  function addErrorToast(title: string) {
    if (import.meta.client) {
      useToast().add({
        title,
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
    } else {
      console.error(title)
    }
  }

  return {
    addErrorToast,
    addSuccessToast
  }
}
