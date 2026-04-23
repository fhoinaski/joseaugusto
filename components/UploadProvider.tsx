'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import UploadModal from '@/components/home/UploadModal'
import PhotoBooth from '@/components/PhotoBooth'
import { emitToast } from '@/lib/ui-feedback'

interface UploadContextValue {
  openUpload: () => void
  openBooth: () => void
  openUploadWithFile: (file: File) => void
  closeUpload: () => void
}

type UploadSuccessType = 'image' | 'video' | 'audio'

const UploadContext = createContext<UploadContextValue>({
  openUpload: () => {},
  openBooth: () => {},
  openUploadWithFile: () => {},
  closeUpload: () => {},
})

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [boothOpen, setBoothOpen] = useState(false)
  const [authorDefault, setAuthorDefault] = useState('')
  const [initialFile, setInitialFile] = useState<File | null>(null)
  const keyRef = useRef(0)

  const openUpload = useCallback(() => {
    try { setAuthorDefault(localStorage.getItem('cha_author') ?? '') } catch { setAuthorDefault('') }
    setInitialFile(null)
    keyRef.current += 1
    setOpen(true)
  }, [])

  const openBooth = useCallback(() => {
    setOpen(false)
    keyRef.current += 1
    setBoothOpen(true)
  }, [])

  const openUploadWithFile = useCallback((file: File) => {
    try { setAuthorDefault(localStorage.getItem('cha_author') ?? '') } catch { setAuthorDefault('') }
    setInitialFile(file)
    setBoothOpen(false)
    keyRef.current += 1
    setOpen(true)
  }, [])

  const closeUpload = useCallback(() => { setOpen(false); setBoothOpen(false) }, [])
  const handleClose = useCallback(() => setOpen(false), [])

  const handleSuccess = useCallback((author: string, thumb: string, type: UploadSuccessType) => {
    if (author && author !== 'Convidado') {
      try { localStorage.setItem('cha_author', author) } catch {}
    }
    window.dispatchEvent(new CustomEvent('cha:upload-success', { detail: { author, thumb, type } }))
    emitToast(
      type === 'video'
        ? 'Video enviado para o album!'
        : type === 'audio'
          ? 'Mensagem em audio enviada!'
          : 'Foto enviada para o album!',
    )
    setOpen(false)
    setInitialFile(null)
  }, [])

  const value = useMemo<UploadContextValue>(() => ({
    openUpload,
    openBooth,
    openUploadWithFile,
    closeUpload,
  }), [openUpload, openBooth, openUploadWithFile, closeUpload])

  return (
    <UploadContext.Provider value={value}>
      {children}
      {open && (
        <UploadModal
          key={keyRef.current}
          authorDefault={authorDefault}
          initialFile={initialFile ?? undefined}
          onClose={handleClose}
          onSuccess={handleSuccess}
          onOpenBooth={openBooth}
        />
      )}
      {boothOpen && (
        <PhotoBooth
          onCapture={openUploadWithFile}
          onClose={() => setBoothOpen(false)}
        />
      )}
    </UploadContext.Provider>
  )
}

export function useUpload(): UploadContextValue {
  return useContext(UploadContext)
}
