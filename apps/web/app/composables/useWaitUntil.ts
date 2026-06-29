export function useWaitUntil() {
  async function waitUntil(condition: () => boolean, delay = 100) {
    while (!condition()) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return {
    waitUntil
  }
}
