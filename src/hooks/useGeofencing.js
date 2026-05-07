import { useEffect, useRef, useState } from 'react'
import distance from '@turf/distance'
import { point } from '@turf/helpers'
import { GEOFENCING_ZONES } from '../config/geofencingZones'

export default function useGeofencing() {
  const [activeZone, setActiveZone] = useState(null)
  const [userPosition, setUserPosition] = useState(null)
  const [error, setError] = useState(null)
  const watchIdRef = useRef(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocalización no disponible')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        setUserPosition({ lat, lon })

        const user = point([lon, lat])
        let matched = null

        for (const zone of GEOFENCING_ZONES) {
          const target = point([zone.lon, zone.lat])
          const dist = distance(user, target, { units: 'meters' })

          if (dist < zone.radius) {
            matched = zone
            break
          }
        }

        setActiveZone(matched)
      },
      (err) => {
        setError(err.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      },
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return { activeZone, userPosition, error }
}
