export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
})
