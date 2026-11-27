export default defineEventHandler((event) => {
  return { framework: 'nuxt', mode: 'server', label: getQuery(event).label }
})
