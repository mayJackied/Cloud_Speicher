export {}

declare module 'vue-router' {
  interface RouteMeta {
    hideChrome?: boolean
    guestOnly?: boolean
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}
