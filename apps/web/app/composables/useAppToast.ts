export function useAppToast() {
  const toast = useToast()

  function addSuccessToast(title: string) {
    toast.add({
      title,
      color: 'success',
      icon: 'i-lucide-circle-check'
    })
  }

  function addErrorToast(title: string) {
    toast.add({
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
