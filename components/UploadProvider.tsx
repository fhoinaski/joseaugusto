'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import UploadModal from '@/components/home/UploadModal'
import { emitToast } from '@/lib/ui-feedback'

interface UploadContextValue {
  openUpload: () => void
}

const UploadContext = createContext<UploadContextValue>({ openUpload: () => {} })

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [authorDefault, setAuthorDefault] = useState('')
  const keyRef = useRef(0)

  const openUpload = useCallback(() => {
    try {
      const saved = localStorage.getItem('cha_author') ?? ''
      setAuthorDefault(saved)
    } catch {
      setAuthorDefault('')
    }
    keyRef.current += 1
    setOpen(true)
  }, [])

  const handleClose = useCallback(() => setOpen(false), [])

  const handleSuccess = useCallback((author: string, thumb: string) => {
    // Persist author for future uploads
    if (author && author !== 'Convidado') {
      try { localStorage.setItem('cha_author', author) } catch {}
    }
    // Notify pages listening for gallery refresh
    window.dispatchEvent(new CustomEvent('cha:upload-success', { detail: { author, thumb } }))
    emitToast('Foto enviada ao álbum! 🌸')
    setOpen(false)
  }, [])

  const value = useMemo<UploadContextValue>(() => ({ openUpload }), [openUpload])

  return (
    <UploadContext.Provider value={value}>
      {children}
      {open && (
        <UploadModal
          key={keyRef.current}
          authorDefault={authorDefault}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </UploadContext.Provider>
  )
}

export function useUpload(): UploadContextValue {
  return useContext(UploadContext)
}
