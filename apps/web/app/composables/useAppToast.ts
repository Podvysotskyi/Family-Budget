export function useAppToast() {
  function addSuccessToast(title: string) {
    useToast().add({
      title,
      color: 'success',
      icon: 'i-lucide-circle-check'
    })
  }

  function addErrorToast(title: string) {
    useToast().add({
      title,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }

  return {
    addErrorToast,
    addSuccessToast
  }
}
