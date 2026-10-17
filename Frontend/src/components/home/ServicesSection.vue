<script setup lang="ts">
const services = [
  {
    title: 'Consultas en consultorio',
    text: 'Control general, diagnóstico y atención en nuestro consultorio de Cipolletti.',
  },
  {
    title: 'Visitas a campo',
    text: 'Atención en chacras y establecimientos rurales, con o sin conexión a internet.',
  },
  {
    title: 'Vacunación y controles',
    text: 'Seguimiento del calendario de vacunas y controles periódicos de cada animal.',
  },
  {
    title: 'Urgencias',
    text: 'Atención prioritaria para casos urgentes, en consultorio o a domicilio.',
  },
]
</script>

<template>
  <section id="servicios" class="border-b border-brand-line">
    <div class="container-page py-16 md:py-20">
      <h2 class="section-title">Servicios</h2>
      <p class="mt-5 max-w-[460px] leading-6 text-brand-inkSoft">
        Lo mismo que hacemos en el consultorio, lo llevamos también a campo cuando hace falta.
      </p>

      <div class="mt-10 grid gap-px border border-brand-line bg-brand-line sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="service in services" :key="service.title" class="bg-brand-surface px-7 pb-12 pt-7">
          <span class="block h-px w-5 bg-brand-ink" aria-hidden="true" />
          <h3 class="mt-6 text-base text-brand-ink">{{ service.title }}</h3>
          <p class="mt-3 text-sm leading-5 text-brand-inkSoft">{{ service.text }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
