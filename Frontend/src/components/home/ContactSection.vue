<script setup lang="ts">
import { site } from '@/config/site'

const { weekdays, saturday } = site.hours

const contactInfo = [
  { label: 'Dirección', value: site.address, href: site.mapsUrl, external: true },
  { label: 'Teléfono / WhatsApp', value: site.phone.display, href: site.phone.whatsapp, external: true },
  { label: 'Email', value: site.email, href: `mailto:${site.email}`, external: false },
  {
    label: 'Horario de consultorio',
    value: `${weekdays.days}, ${weekdays.time}. ${saturday.days}, ${saturday.time}.`,
  },
]
</script>

<template>
  <section id="contacto" class="border-b border-brand-line">
    <div class="container-page py-16 md:py-20">
      <h2 class="section-title">Información de contacto</h2>

      <div class="mt-12 grid gap-10 md:grid-cols-2 md:gap-12">
        <dl class="space-y-5">
          <div v-for="item in contactInfo" :key="item.label">
            <dt class="text-xs text-brand-inkSoft">{{ item.label }}</dt>
            <dd class="mt-2 text-brand-ink">
              <a
                v-if="item.href"
                :href="item.href"
                :target="item.external ? '_blank' : undefined"
                :rel="item.external ? 'noopener' : undefined"
                class="underline-offset-4 hover:text-brand-accent hover:underline"
              >
                {{ item.value }}
              </a>
              <template v-else>{{ item.value }}</template>
            </dd>
          </div>
        </dl>

        <a
          :href="site.mapsUrl"
          target="_blank"
          rel="noopener"
          class="group relative block h-[236px] overflow-hidden rounded border border-brand-line bg-brand-accentSoft"
          :aria-label="`Ver ${site.address} en Google Maps`"
        >
          <svg
            class="absolute inset-0 h-full w-full"
            viewBox="0 0 600 236"
            preserveAspectRatio="none"
            fill="none"
            stroke="#a9b0a6"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path d="M0 38 C 150 20, 250 60, 300 58 S 500 10, 600 32" />
            <path d="M0 92 C 150 70, 250 112, 320 112 S 520 64, 600 86" />
            <path d="M0 144 C 150 124, 250 166, 300 164 S 500 116, 600 138" />
          </svg>
          <span
            class="absolute left-[53%] top-[48%] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-accent/20"
          />
          <span
            class="absolute left-[53%] top-[48%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-accentInk"
          />
          <span class="absolute bottom-5 left-5 text-xs text-brand-ink">{{ site.address }}</span>
          <span
            class="absolute bottom-5 right-5 text-xs text-brand-accent underline-offset-4 group-hover:underline"
          >
            Ver en Google Maps →
          </span>
        </a>
      </div>
    </div>
  </section>
</template>
