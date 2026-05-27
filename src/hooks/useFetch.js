import { useState, useEffect, useCallback } from 'react'

/**
 * Hook générique pour récupérer des données depuis l'API.
 * @param {Function} fetchFn  — fonction async qui retourne une promesse axios
 * @param {Array}    deps     — dépendances qui déclenchent un re-fetch
 */
export default function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFn()
      setData(res.data)
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
