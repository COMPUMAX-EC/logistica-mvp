import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn(
    'Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copia frontend/.env.example a frontend/.env y completa los valores de tu proyecto Supabase.'
  )
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-anon-key')
