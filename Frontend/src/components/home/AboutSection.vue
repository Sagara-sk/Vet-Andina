<script setup lang="ts">
const features = [
  {
    title: 'Consultorio y campo',
    text: 'Atención presencial en Cipolletti y visitas a establecimientos rurales del Alto Valle.',
  },
  {
    title: 'Historia clínica digital',
    text: 'Vacunas, controles y tratamientos registrados por mascota, siempre disponibles.',
  },
  {
    title: 'Turnos en línea',
    text: 'Reservá y consultá tus turnos sin tener que coordinar por teléfono.',
  },
]
</script>

<template>
  <section id="quienes-somos" class="border-b border-brand-line">
    <div class="container-page grid gap-12 py-16 md:grid-cols-2 md:gap-24 md:py-20">
      <div>
        <h2 class="section-title">Quiénes somos</h2>
        <div class="mt-8 max-w-[420px] space-y-6 leading-6 text-brand-inkSoft">
          <p>
            Somos un equipo veterinario con base en Cipolletti, Río Negro. Atendemos en consultorio
            y también salimos a las chacras y establecimientos rurales del Alto Valle, donde la
            conexión a internet no siempre llega.
          </p>
          <p>
            Llevamos la ficha clínica de cada mascota de forma digital: vacunas, controles y
            tratamientos quedan registrados y a mano, esté donde esté el animal.
          </p>
        </div>
      </div>

      <ul>
        <li v-for="item in features" :key="item.title" class="border-t border-brand-line py-5">
          <h3 class="font-serif text-lg text-brand-ink">{{ item.title }}</h3>
          <p class="mt-1 text-sm text-brand-inkSoft">{{ item.text }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>
