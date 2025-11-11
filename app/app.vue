<template>
  <div id="app">
    <header>
      <nav>
        <router-link to="/">Home</router-link> |
        <router-link to="/interviews">Interviews</router-link>
      </nav>
    </header>
    <main>
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
// App entry point
</script>

<style>
#app {
  min-height: 100vh;
}

header {
  padding: 1rem;
  border-bottom: 1px solid #ccc;
}

nav {
  display: flex;
  gap: 1rem;
}
</style>
