"use client"

import { useSyncExternalStore } from "react"

function subscribe(onStoreChange: () => void) {
  document.addEventListener("fullscreenchange", onStoreChange)
  return () => {
    document.removeEventListener("fullscreenchange", onStoreChange)
  }
}

function getSnapshot() {
  return !!document.fullscreenElement
}

function getServerSnapshot() {
  return false
}

export function useFullscreen() {
  const isFullscreen = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  const enterFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error)
    }
  }

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error)
    }
  }

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  }
}
