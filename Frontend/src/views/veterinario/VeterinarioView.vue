<script setup lang="ts"></script>

<template>
  <div class="min-h-screen bg-[#fafaf7] text-[#1e211c]">

    <!-- Sidebar -->
    <aside
      class="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#1e211c] text-[#c9ccc2]"
    >

      <!-- Logo -->
      <div class="border-b border-[#343730] px-6 py-6">
        <h1 class="font-serif text-2xl text-white">
          Vet Andina
        </h1>

        <p class="mt-1 text-sm text-[#8a8d83]">
          Panel veterinario
        </p>
      </div>

      <!-- Navegación -->
      <nav class="flex-1 px-4 py-6">


  <RouterLink
    to="/panel-veterinario"
    class="mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition hover:bg-[#343730] hover:text-white"
  >
    <span class="h-1.5 w-1.5 rounded-full bg-[#8a8d83]"></span>
    Dashboard
  </RouterLink>

  <RouterLink
    to="/panel-veterinario/offline"
    class="mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition hover:bg-[#343730] hover:text-white"
  >
    <span class="h-1.5 w-1.5 rounded-full bg-[#8a8d83]"></span>
    Modo offline
  </RouterLink>

</nav>

      <!-- Usuario -->
      <div class="border-t border-[#343730] p-4">
        <div class="flex items-center gap-3">

          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-[#34503a] font-semibold text-white"
          >
            J
          </div>

          <div>
            <p class="text-sm font-medium text-white">
              Dr. Julián
            </p>

            <p class="text-xs text-[#8a8d83]">
              Veterinario
            </p>
          </div>

        </div>
      </div>

    </aside>


    <!-- Contenido -->
    <main class="ml-64 min-h-screen">

      <div class="p-8">
        <RouterView />
      </div>

    </main>

  </div>
</template>

<style scoped></style>
