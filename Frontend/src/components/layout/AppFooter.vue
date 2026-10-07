<script setup lang="ts">
import { site } from '@/config/site'

const year = new Date().getFullYear()
</script>

<template>
  <footer>
    <div class="container-page pt-10">
      <div class="grid gap-10 pb-8 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p class="text-xl font-bold text-brand-ink">{{ site.name }}</p>
          <p class="mt-3 text-sm text-brand-inkSoft">{{ site.tagline }}</p>
        </div>

        <div>
          <p class="text-sm font-bold text-brand-ink">Contacto</p>
          <ul class="mt-4 space-y-2 text-sm text-brand-inkSoft">
            <li>
              <a :href="site.mapsUrl" target="_blank" rel="noopener" class="flex items-center gap-2 hover:text-brand-ink">
                <svg class="h-4 w-4 text-brand-accent" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
                </svg>
                {{ site.address }}
              </a>
            </li>
            <li>
              <a :href="site.phone.whatsapp" target="_blank" rel="noopener" class="flex items-center gap-2 hover:text-brand-ink">
                <svg class="h-4 w-4 text-brand-accent" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1z" />
                </svg>
                {{ site.phone.display }}
              </a>
            </li>
            <li>
              <a :href="`mailto:${site.email}`" class="flex items-center gap-2 hover:text-brand-ink">
                <svg class="h-4 w-4 text-brand-accent" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5z" />
                </svg>
                {{ site.email }}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p class="text-sm font-bold text-brand-ink">Horarios</p>
          <ul class="mt-4 space-y-2 text-sm text-brand-inkSoft">
            <li>{{ site.hours.weekdays.days }}: {{ site.hours.weekdays.time }}</li>
            <li>{{ site.hours.saturday.days }}: {{ site.hours.saturday.time }}</li>
          </ul>
        </div>
      </div>

      <div class="border-t border-brand-line py-6">
        <p class="text-xs text-brand-inkSoft">© {{ year }} {{ site.name }}. Todos los derechos reservados.</p>
      </div>
    </div>
  </footer>
</template>
