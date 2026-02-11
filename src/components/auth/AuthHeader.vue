<script lang="ts"></script>

<template>
  <header
    class="w-full bg-[#072069] h-16 md:h-20 flex items-center justify-between px-4 md:px-8 shadow-md z-20 relative"
  >
    <div class="flex flex-row items-center gap-2 md:gap-3">
      <img
        src="/logo.png"
        alt="T.A.L.A. Logo"
        class="h-8 md:h-10 w-auto brightness-0 invert"
      />

      <span
        class="font-ribeye text-lg md:text-2xl text-white tracking-widest mb-1"
      >
        T.A.L.A.
      </span>
    </div>

    <div class="absolute left-1/2 -translate-x-1/2 hidden md:block">
      <slot name="navigation" />
    </div>

    <div class="hidden md:block md:w-37.5"></div>
  </header>
</template>
