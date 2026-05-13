
'use client'
 
import axios from 'axios'
 
import { FlightLogsTab } from '@/components/operation/FlightLogsTab'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface FlightLog {
    log_id: number
    log_source: 'manual' | 'flytbase'
    original_filename: string
    flytbase_flight_id: string | null
    uploaded_at: string
    download_url: string
}

interface FlytbaseFlight {
    flight_id: string
    flight_name?: string
    start_time?: number
    end_time?: number
    duration?: number
    distance?: number
    drone_name?: string
    status?: string
}

export function EditMissionLogTab({ missionId, isDark }: { missionId: number; isDark: boolean }) {
    const [logs, setLogs] = useState<FlightLog[]>([])
    const [loadingLogs, setLoadingLogs] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [fbWindow, setFbWindow] = useState(30)
    const [loadingFlights, setLoadingFlights] = useState(false)
    const [flights, setFlights] = useState<FlytbaseFlight[]>([])
    const [selectedFlight, setSelectedFlight] = useState<string | null>(null)
    const [attachingFlight, setAttachingFlight] = useState(false)
    const [autoSyncingFlight, setAutoSyncingFlight] = useState(false)
    const [flightsError, setFlightsError] = useState<string | null>(null)

    useEffect(() => {
        setLoadingLogs(true)
        axios.get(`/api/operation/board/flight-logs?mission_id=${missionId}`)
            .then(res => { if (res.data.code === 1) setLogs(res.data.data ?? []) })
            .catch(() => toast.error('Failed to load flight logs'))
            .finally(() => setLoadingLogs(false))
    }, [missionId])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const form = new FormData()
            form.append('mission_id', String(missionId))
            form.append('file', file)
            const { data } = await axios.post('/api/operation/board/flight-logs/upload', form)
            if (data.code === 1) {
                toast.success('Log file uploaded')
                const res = await axios.get(`/api/operation/board/flight-logs?mission_id=${missionId}`)
                if (res.data.code === 1) setLogs(res.data.data ?? [])
            } else {
                toast.error(data.message ?? 'Upload failed')
            }
        } catch {
            toast.error('Upload failed')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleFetchFlights = async () => {
        setLoadingFlights(true)
        setFlights([])
        setSelectedFlight(null)
        setFlightsError(null)
        try {
            const { data } = await axios.get(`/api/flytbase/flights?window=${fbWindow}`)
            if (data.success) {
                setFlights(data.flights ?? [])
                if ((data.flights ?? []).length === 0) setFlightsError('No flights found in this time window.')
            } else {
                setFlightsError(data.error ?? 'Failed to fetch flights')
            }
        } catch {
            setFlightsError('Failed to fetch Control Center flights')
        } finally {
            setLoadingFlights(false)
        }
    }

    const handleAttachFlight = async () => {
        if (!selectedFlight) return
        setAttachingFlight(true)
        setFlightsError(null)
        try {
            const { data } = await axios.post('/api/operation/board/flight-logs/flytbase', {
                mission_id: missionId,
                flight_id: selectedFlight,
            })
            if (data.code === 1) {
                toast.success('Flight attached')
                setSelectedFlight(null)
                setFlights([])
                const res = await axios.get(`/api/operation/board/flight-logs?mission_id=${missionId}`)
                if (res.data.code === 1) setLogs(res.data.data ?? [])
            } else {
                toast.error(data.message ?? 'Attach failed')
            }
        } catch {
            toast.error('Failed to attach flight')
        } finally {
            setAttachingFlight(false)
            setAutoSyncingFlight(false)
        }
    }

    return (
        <FlightLogsTab
            logs={logs}
            loadingLogs={loadingLogs}
            uploading={uploading}
            fileInputRef={fileInputRef}
            fbWindow={fbWindow}
            loadingFlights={loadingFlights}
            flights={flights}
            selectedFlight={selectedFlight}
            attachingFlight={attachingFlight}
            autoSyncingFlight={autoSyncingFlight}
            flightsError={flightsError}
            isDark={isDark}
            onFileChange={handleFileChange}
            onWindowChange={setFbWindow}
            onFetchFlights={handleFetchFlights}
            onSelectFlight={id => setSelectedFlight(prev => prev === id ? null : id)}
            onAttachFlight={handleAttachFlight}
        />
    )
}
