<template>

  <div class="page">

    <div class="brand enterLeft">

      <div class="bg">
        <img :src="ccbBg" alt="" class="bgImg" />
      </div>

      <div class="overlay" />

      <div class="inner">

        <div class="logo">

          <svg viewBox="0 0 40 40" fill="none">

            <rect width="40" height="40" rx="8" fill="rgba(255,255,255,0.2)" />

            <path d="M12 28V14l8-5 8 5v14h-6v-7h-4v7H12z" fill="white" />

          </svg>

        </div>

        <h1 class="title">万达物业</h1>

        <p class="desc">智享万达 · 社区管理系统</p>

        <p class="hint">统一管理住户、积分、商家与物业运营</p>

      </div>

    </div>



    <div class="formWrap enterRight">

      <div class="card">

        <div class="header">

          <h2 class="title">登录系统</h2>

          <p class="desc">请输入手机号和密码继续</p>

        </div>



        <form class="form" @submit.prevent="handleSubmit">

          <div class="field">

            <label class="label">手机号</label>

            <div class="inputWrap">

              <IconSvg name="person" class="inputIcon" />

              <input

                v-model="form.phone"

                type="text"

                class="input"

                placeholder="请输入手机号"

                autocomplete="username"

              />

            </div>

          </div>



          <div class="field">

            <label class="label">密码</label>

            <div class="inputWrap">

              <IconSvg name="permission" class="inputIcon" />

              <input

                v-model="form.password"

                type="password"

                class="input"

                placeholder="请输入密码"

                autocomplete="current-password"

              />

            </div>

          </div>



          <div class="options">

            <label class="remember">

              <input v-model="form.remember" type="checkbox" />

              <span class="checkmark" />

              <span>记住登录状态</span>

            </label>

          </div>



          <p v-if="error" class="error">{{ error }}</p>



          <button type="submit" class="btnPrimary" :disabled="loading">

            {{ loading ? '登录中...' : '登录' }}

          </button>

        </form>

      </div>

    </div>

  </div>

</template>



<script setup lang="ts">

import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import IconSvg from '../components/IconSvg.vue'
import { useAuthStore } from '../stores/auth'
import { getRoleHomeRoute } from '../constants/roles'
import { ApiError } from '../api/request'
import ccbBg from '../assets/images/ccb.jpg'

const router = useRouter()
const auth = useAuthStore()



const form = reactive({

  phone: '',

  password: '',

  remember: true

})

const loading = ref(false)

const error = ref('')



async function handleSubmit() {

  error.value = ''

  if (!form.phone.trim()) {

    error.value = '请输入手机号'

    return

  }

  if (!form.password.trim()) {

    error.value = '请输入密码'

    return

  }



  loading.value = true

  try {

    await auth.login(form.phone, form.password, form.remember)
    router.replace({ name: getRoleHomeRoute(auth.profile?.role) })

  } catch (e) {

    error.value = e instanceof ApiError ? e.message : '登录失败，请检查手机号和密码'

  } finally {

    loading.value = false

  }

}

</script>



<style scoped>

.page {

  display: flex;

  min-height: 100vh;

  background: #f4f5f7;

  overflow: hidden;

}



.brand {

  position: relative;

  flex: 1;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 48px;

  color: #ffffff;

  overflow: hidden;

}



.bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.bgImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.08);
  animation: bgZoom 1.2s ease-out forwards;
}

.overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(135deg, rgba(92, 92, 158, 0.42) 0%, rgba(138, 138, 212, 0.35) 100%);
}

.inner {
  position: relative;
  z-index: 2;

  max-width: 360px;

}



.logo {

  width: 56px;

  height: 56px;

  margin-bottom: 24px;

}



.logo svg {

  width: 100%;

  height: 100%;

}



.brand .title {

  font-size: 32px;

  font-weight: 600;

  margin-bottom: 12px;

}



.brand .desc {

  font-size: 16px;

  opacity: 0.95;

  margin-bottom: 16px;

}



.brand .hint {

  font-size: 14px;

  opacity: 0.75;

  line-height: 1.6;

}



.formWrap {

  flex: 1;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 48px 32px;

}



.card {

  width: 100%;

  max-width: 400px;

  background: #ffffff;

  border-radius: 12px;

  padding: 40px;

  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

}



.header {

  margin-bottom: 32px;

}



.header .title {

  font-size: 24px;

  font-weight: 600;

  color: #1f1f2e;

  margin-bottom: 8px;

}



.header .desc {

  font-size: 14px;

  color: #8c8c9a;

}



.form {

  display: flex;

  flex-direction: column;

  gap: 20px;

}



.field {

  display: flex;

  flex-direction: column;

  gap: 8px;

}



.label {

  font-size: 14px;

  color: #5c5c66;

}



.inputWrap {

  display: flex;

  align-items: center;

  gap: 10px;

  padding: 0 14px;

  height: 44px;

  border: 1px solid #e8e8ec;

  border-radius: 8px;

  background: #fafafc;

  transition: border-color 0.2s;

}



.inputWrap:focus-within {

  border-color: #5c5c9e;

  background: #ffffff;

}



.inputIcon {

  width: 18px;

  height: 18px;

  color: #8c8c9a;

  flex-shrink: 0;

}



.input {

  flex: 1;

  font-size: 14px;

  color: #1f1f2e;

}



.input::placeholder {

  color: #8c8c9a;

}



.options {

  display: flex;

  align-items: center;

  justify-content: space-between;

}



.remember {

  display: flex;

  align-items: center;

  gap: 8px;

  font-size: 14px;

  color: #5c5c66;

  cursor: pointer;

}



.remember input {

  position: absolute;

  opacity: 0;

  width: 0;

  height: 0;

}



.checkmark {

  width: 16px;

  height: 16px;

  border: 2px solid #d0d0d8;

  border-radius: 50%;

  flex-shrink: 0;

  transition: all 0.2s;

  position: relative;

  box-sizing: border-box;

}



.remember input:checked + .checkmark {

  background: transparent;

  border-color: #5c5c9e;

}



.remember input:checked + .checkmark::after {

  content: '';

  position: absolute;

  inset: 3px;

  border-radius: 50%;

  background: #5c5c9e;

}



.error {

  font-size: 13px;

  color: #e05c5c;

}



.btnPrimary {

  width: 100%;

  height: 44px;

  border-radius: 8px;

  background: #5c5c9e;

  color: #ffffff;

  font-size: 15px;

  font-weight: 500;

  transition: background 0.2s;

}



.btnPrimary:hover:not(:disabled) {

  background: #52529a;

}



.btnPrimary:disabled {

  opacity: 0.7;

  cursor: not-allowed;

}



.enterLeft {

  animation: enterLeft 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;

}



.enterLeft .inner {

  animation: fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;

}



.enterRight {

  animation: enterRight 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;

}



.enterRight .card {

  animation: fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.28s both;

}



@keyframes enterLeft {

  from {

    opacity: 0;

    transform: translateX(-48px);

  }

  to {

    opacity: 1;

    transform: translateX(0);

  }

}



@keyframes enterRight {

  from {

    opacity: 0;

    transform: translateX(48px);

  }

  to {

    opacity: 1;

    transform: translateX(0);

  }

}



@keyframes fadeUp {

  from {

    opacity: 0;

    transform: translateY(20px);

  }

  to {

    opacity: 1;

    transform: translateY(0);

  }

}



@keyframes bgZoom {
  from {
    transform: scale(1.15);
  }
  to {
    transform: scale(1.08);
  }
}



@media (max-width: 900px) {

  .page {

    flex-direction: column;

  }



  .brand {

    min-height: 280px;

    padding: 40px 32px;

  }



  .inner {

    max-width: none;

    text-align: center;

  }



  .logo {

    margin-left: auto;

    margin-right: auto;

  }



  .formWrap {

    padding: 32px 24px 48px;

  }



  .card {

    padding: 32px 24px;

  }



  .enterLeft,

  .enterRight {

    animation-name: fadeUp;

    transform: none;

  }



  .enterRight {

    animation-delay: 0.08s;

  }

}



@media (prefers-reduced-motion: reduce) {

  .bg,

  .enterLeft,

  .enterRight,

  .enterLeft .inner,

  .enterRight .card {

    animation: none !important;

  }

}

@media (max-width: 640px) {

  .brand {

    min-height: 220px;

    padding: 28px 20px;

  }



  .brand .title {

    font-size: 26px;

  }



  .brand .desc {

    font-size: 14px;

  }



  .brand .hint {

    font-size: 13px;

  }



  .formWrap {

    padding: 0 16px 20px;

    margin-top: -24px;

  }



  .card {

    max-width: none;

    border-radius: 18px 18px 0 0;

    padding: 28px 20px 24px;

    box-shadow: 0 -8px 24px rgba(31, 31, 46, 0.08);

  }



  .header {

    margin-bottom: 24px;

  }



  .inputWrap,

  .btnPrimary {

    height: 48px;

  }

}

</style>


