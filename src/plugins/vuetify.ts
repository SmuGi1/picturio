import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: { background: '#141312', surface: '#1c1b1a', primary: '#5b8def' },
      },
      light: {
        dark: false,
        colors: { background: '#f6f5f2', surface: '#ffffff', primary: '#3465c9' },
      },
    },
  },
})
