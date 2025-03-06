<template>
  <div class="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
    <div class="create-post-container bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
      <!-- Заголовок формы -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <router-link 
            :to="{ name: 'CategoryPosts' }" 
            class="text-gray-600 hover:text-purple-600 transition-colors duration-200"
          >
            <i class="fas fa-arrow-left text-xl"></i>
          </router-link>
          <h2 class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Создать новую тему
            <span class="ml-2 text-xl">✨</span>
          </h2>
        </div>
        <div class="text-gray-500 dark:text-gray-400 text-sm">
          {{ remainingCharacters }} символов осталось
        </div>
      </div>

      <!-- Поле заголовка -->
      <div class="mb-4">
        <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Заголовок <span class="text-red-500">*</span>
        </label>
        <input
          id="title"
          v-model="postTitle"
          type="text"
          class="w-full px-4 py-2 border-2 rounded-lg transition duration-200"
          :class="{
            'border-red-300 focus:border-red-500': !postTitle.trim() && showValidation,
            'border-gray-200 focus:border-purple-500': postTitle.trim() || !showValidation
          }"
          placeholder="Введите заголовок темы..."
          @input="handleTitleInput"
        >
        <p v-if="!postTitle.trim() && showValidation" class="mt-1 text-sm text-red-500">
          Заголовок обязателен для заполнения
        </p>
      </div>

      <!-- Поле для контента -->
      <div class="relative mb-4">
       <!-- Предпросмотр загруженных файлов -->
  <div v-if="store.state.picture.uploadedImages.length > 0 || 
             store.state.video.uploadedVideos.length > 0 || 
             store.state.format.uploadedFiles.length > 0" 
       class="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
 <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Предпросмотр загруженных файлов:</h3>

 <!-- Изображения -->
<div v-if="store.state.picture.uploadedImages.length > 0" 
     class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
  <div v-for="(image, index) in store.state.picture.uploadedImages" 
       :key="index" 
       class="relative group">
    <img :src="store.getters['picture/getImageUrl'](image)" 
         class="w-full h-48 object-cover rounded-lg shadow-md transform transition-transform duration-300 hover:scale-110"
         :alt="'Загруженное изображение ' + (index + 1)"
         @load="handleImageLoad"
         @error="handleImageError">
    <button 
      @click="handleImageRemove(index)"
      class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <i class="fas fa-times"></i>
    </button>
  </div>
</div>

 <!-- Видео -->
<div v-if="store.state.video.uploadedVideos.length > 0 || isVideoUploading" 
     class="mt-4">
  <h4 class="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Видео:</h4>
  
  <!-- Индикатор загрузки -->
  <div v-if="isVideoUploading" class="mb-4">
    <div class="flex items-center gap-2 mb-2">
      <i class="fas fa-cloud-upload-alt text-purple-600 animate-pulse"></i>
      <span class="text-sm text-gray-600 dark:text-gray-400">
        Загрузка на сервер: {{ videoUploadProgress }}%
      </span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div class="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
           :style="{ width: `${videoUploadProgress}%` }">
      </div>
    </div>
  </div>

  <!-- Список видео -->
  <div v-if="store.state.video.uploadedVideos.length > 0"
       class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div v-for="(video, index) in store.state.video.uploadedVideos" 
         :key="index" 
         class="relative group">
      <vue-plyr ref="plyr" class="video-player">
        <video 
          :src="video"
          :crossorigin="true"
          playsinline
          controls>
        </video>
      </vue-plyr>
      <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
        <span class="text-white text-sm">
          {{ getVideoFileName(video) }}
        </span>
      </div>
      <button 
        @click="removeVideo(index)"
        class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</div>

 <!-- Документы -->
<div v-if="store.state.format.uploadedFiles.length > 0" class="mt-4">
  <h4 class="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Документы:</h4>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div v-for="(file, index) in store.state.format.uploadedFiles" 
         :key="index"
         class="relative group bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
      <div class="flex items-center">
        <i class="fas fa-file-alt text-gray-500 mr-2"></i>
        <span class="text-sm text-gray-700 dark:text-gray-300">{{ file.name }}</span>
      </div>
      <button 
        @click="removeFormat(index)"
        class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors duration-200">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</div>
</div>
<div v-if="store.state.music.uploadedAudio.length > 0 || isAudioUploading" class="mb-4">
  <h4 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Аудио:</h4>
  
  <!-- Индикатор загрузки аудио -->
  <div v-if="isAudioUploading" class="mb-4">
    <div class="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
      <span class="text-gray-700 dark:text-gray-300">Загрузка аудио...</span>
    </div>
  </div>

  <!-- Список аудио файлов -->
  <div v-if="store.state.music.uploadedAudio.length > 0" class="grid grid-cols-1 gap-4">
    <div v-for="(audio, index) in store.state.music.uploadedAudio" 
        :key="index" 
        class="relative flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div class="flex-1">
        <div class="relative">
          <!-- Индикатор загрузки аудио файла -->
          <div v-if="audioLoadingStates[index]" 
               class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-600 bg-opacity-75 rounded">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
          
          <audio 
            controls 
            preload="auto"
            class="w-full mt-2"
            crossorigin="anonymous"
            @loadstart="onAudioLoadStart(index)"
            @canplay="onAudioCanPlay(index)"
            @error="(e) => {
              console.error('Ошибка аудио плеера:', e);
              audioLoadingStates[index] = false;
            }"
          >
            <source 
              :src="audio.url" 
              :type="audio.type"
              crossorigin="anonymous"
            >
            Ваш браузер не поддерживает аудио элемент.
          </audio>
        </div>
        
        <!-- Название файла -->
        <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ getAudioFileName(audio.url) }}
        </div>
      </div>
      <button @click="removeAudio(index)" 
              class="ml-2 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</div>

        <div class="flex flex-wrap gap-2 mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <!-- Жирный -->
          <button
            @click="applyFormat('bold')"
            class="p-2 hover:bg-purple-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 tooltip"
            data-tooltip="Жирный"
          >
            <i class="fas fa-bold text-gray-600 dark:text-gray-300"></i>
          </button>
        
          <!-- Курсив -->
          <button
            @click="applyFormat('italic')"
            class="p-2 hover:bg-purple-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 tooltip"
            data-tooltip="Курсив"
          >
            <i class="fas fa-italic text-gray-600 dark:text-gray-300"></i>
          </button>
        
          <!-- Подчеркнутый -->
          <button
            @click="applyFormat('underline')"
            class="p-2 hover:bg-purple-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 tooltip"
            data-tooltip="Подчеркнутый"
          >
            <i class="fas fa-underline text-gray-600 dark:text-gray-300"></i>
          </button>
        
          <!-- Зачеркнутый -->
          <button
            @click="applyFormat('strikethrough')"
            class="p-2 hover:bg-purple-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 tooltip"
            data-tooltip="Зачеркнутый"
          >
            <i class="fas fa-strikethrough text-gray-600 dark:text-gray-300"></i>
          </button>
        
    
          
          <!-- Разделитель -->
          <div class="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
          
          <!-- Кнопки для медиа -->
          <button 
            @click="triggerImageUpload" 
            class="p-2 hover:bg-purple-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 tooltip" 
            data-tooltip="Прикрепить изображение"
          >
            <i class="fas fa-image text-gray-600 dark:text-gray-300"></i>
          </button>
        
          <button 
            @click="triggerVideoUpload" 
            class="p-2 hover:bg-purple-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 tooltip" 
            data-tooltip="Прикрепить видео"
          >
            <i class="fas fa-video text-gray-600 dark:text-gray-300"></i>
          </button>

          <button 
          @click="triggerAudioUpload" 
          class="p-2 hover:bg-purple-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 tooltip" 
          data-tooltip="Прикрепить музыку"
        >
          <i class="fas fa-music text-gray-600 dark:text-gray-300"></i>
        </button>
      
        

        
        <button 
        @click="triggerFormatUpload" 
        class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        title="Прикрепить документ"
        @mouseenter="console.log('🖱️ Курсор наведен на кнопку загрузки документа')"
        @mouseleave="console.log('🖱️ Курсор убран с кнопки загрузки документа')"
      >
        <i class="fas fa-file-upload"></i>
      </button>
        
      <button 
      @click="openEmojiPicker" 
      class="p-2 hover:bg-purple-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 tooltip" 
      data-tooltip="Добавить эмодзи"
    >
      <i class="far fa-smile text-gray-600 dark:text-gray-300"></i>
    </button>
  </div>

  <Emoji 
    :is-visible="showEmojiPicker"
    :position="emojiPickerPosition"
    @close="showEmojiPicker = false"
    @select="handleEmojiSelect"
  />
        <div
          ref="editor"
          id="content"
          contenteditable="true"
          class="w-full min-h-[300px] p-4 border-2 rounded-lg transition duration-200"
          :class="{
            'border-red-300 focus:border-red-500 dark:border-red-700': showValidation && !postContent.trim(),
            'border-gray-200 focus:border-purple-500 dark:border-gray-700 dark:focus:border-purple-500': !showValidation || postContent.trim()
          }"
          @input="handleInput"
          @paste="handlePaste"
        ></div>
        <p v-if="showValidation && !postContent.trim()" class="mt-1 text-sm text-red-500">
          Содержание обязательно для заполнения
        </p>
        <div class="text-sm mt-2" :class="{'text-red-500': remainingCharacters === 0, 'text-gray-500': remainingCharacters > 0}">
          {{ remainingCharacters === 0 ? 'Достигнут лимит символов' : `${remainingCharacters} символов осталось` }}
        </div>
      </div>

      <div class="flex items-center mb-4 justify-center w-full">
        <label 
          :for="images.length >= 10 ? '' : 'dropzone-file'" 
          class="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer"
          :class="images.length >= 10 ? 'border-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'border-gray-300 bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600'"
        >
          <div class="flex flex-col items-center justify-center pt-5 pb-6">
            <svg class="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
            </svg>
            <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span v-if="images.length >= 10" class="font-semibold text-red-500">
                Достигнут лимит в 10 изображений
              </span>
              <span v-else class="font-semibold">
                Нажмите для загрузки или перетащите
              </span>
            </p>
            <p v-if="images.length < 10" class="text-xs text-gray-500 dark:text-gray-400">
              PNG, JPG или GIF (осталось: {{ 10 - images.length }})
            </p>
          </div>
          <input 
            v-if="images.length < 10"
            id="dropzone-file" 
            type="file" 
            class="hidden" 
            accept="image/*"
            @change="handleFileUpload"
            multiple
          />
        </label>
      </div>

     <!-- Нижняя панель с элементами управления -->
<div class="flex flex-col gap-4 mb-4">
  <!-- Теги -->
  <div class="flex-grow flex items-center gap-4">
    <!-- Поле ввода тегов с тегами под ним -->
    <div class="flex-grow">
      <input
      v-model="tagInput"
      @keydown.enter.prevent="addTag"
      class="w-96 px-3 py-1 border border-gray-300 rounded focus:border-gray-400 focus:outline-none dark:bg-gray-700 dark:text-white transition"
      :placeholder="store.getters['tegs/canAddMoreTags'] ? 'Теги...' : 'Достигнут лимит тегов'"
      :disabled="!store.getters['tegs/canAddMoreTags']"
    />
      <!-- Отображение тегов под инпутом -->
      <div class="flex flex-wrap gap-2 mt-2">
        <span 
          v-for="(tag, index) in store.state.tegs.tags" 
          :key="index"
          class="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-200 rounded-full flex items-center gap-2"
        >
          {{ tag }}
          <button 
            @click="store.dispatch('tegs/removeTag', tag)"
            class="hover:text-purple-800 dark:hover:text-purple-100"
          >
            <i class="fas fa-times"></i>
          </button>
        </span>
      </div>
    </div>

    <!-- Кнопка предпросмотра -->
    <button
    @click="togglePreview"
    class="px-4 py-2 bg-pink-100 dark:bg-pink-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-pink-200 dark:hover:bg-pink-600 transition duration-200"
  >
    <i class="fas" :class="previewMode ? 'fa-edit' : 'fa-eye'"></i>
    {{ previewMode ? 'Редактировать' : 'Предпросмотр' }}
  </button>

    <!-- Кнопка создания темы -->
    <button
    @click="validateAndSubmit"
    class="px-6 py-2 text-white font-medium rounded-lg transition-all duration-200"
    :class="{
      'bg-purple-600 hover:bg-purple-700': isFormValid,
      'bg-gray-400 cursor-not-allowed': !isFormValid
    }"
    :disabled="!isFormValid"
  >
    <i class="fas fa-paper-plane mr-2"></i>
    Создать тему
  </button>
  
  </div>
</div>

      <!-- Предпросмотр созданного поста -->
      <Preview
        v-if="previewMode"
        :show="previewMode"
        :title="postTitle"
        :content="postContent"
        :tags="store.state.tegs.tags"
        :images="store.state.picture.uploadedImages"
        :videos="store.state.video.uploadedVideos"
        :audio="store.state.music.uploadedAudio"
        :documents="store.state.format.uploadedFiles"
        @close="togglePreview"
        @removeImage="handleImageRemove"
        @removeVideo="removeVideo"
        @removeAudio="removeAudio"
        @removeDocument="removeFormat"
      />

      <!-- Скрытые input'ы для загрузки файлов -->
      <input
        type="file"
        ref="imageInput"
        accept="image/*"
        class="hidden"
        @change="handleFileUpload"
      />
      <input
      ref="videoInput"
      type="file"
      accept="video/mp4,video/mov,video/quicktime"
      @change="handleVideoUpload"
      class="hidden"
      multiple
    >
      <input
      type="file"
      ref="audioInput"
      accept="audio/mpeg, audio/mp3, .mp3, .m4a"
      class="hidden"
      @change="handleAudioUpload"
      multiple
    />
      <input
        type="file"
        ref="formatInput"
        accept=".doc,.docx,.pdf,.txt,.rtf,.odt"
        class="hidden"
        @change="handleFormatUpload"
      />
      <input
        type="file"
        ref="fileInput"
        accept=".png,.jpg,.jpeg,.gif,.mp4,.mov"
        class="hidden"
        @change="handleFileUpload"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, onMounted, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import { useToast } from 'vue-toastification';
import Preview from './Preview.vue';
import Emoji from '../components/Emoji.vue';
import S3Image from '../components/S3Image.vue';
import { useRouter, useRoute } from 'vue-router';
import { database } from '../plugins/firebase';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
const store = useStore();
const toast = useToast();
const categoryId = computed(() => route.params.categoryId);

// Определение refs для input'ов
const imageInput = ref(null);
const videoInput = ref(null);
const audioInput = ref(null);
const formatInput = ref(null);

const postTitle = ref('');
const postContent = ref('');
const tagInput = ref('');
const tags = ref([]);
const images = ref([]);
const attachments = ref([]);
const isUploading = ref(false);
const remainingCharacters = computed(() => Math.max(0, 333 - (postContent.value?.length || 0)));
const remainingTitleCharacters = computed(() => Math.max(0, 33 - (postTitle.value?.length || 0)));
const editor = ref(null);

const isVideoUploading = ref(false);
const isAudioUploading = ref(false);
const uploadProgress = ref(0);

const audioFiles = computed(() => store.state.music.uploadedAudio);
const audioLoadingStates = ref([]);

const onAudioLoadStart = (index) => {
  audioLoadingStates.value[index] = true;
};

const onAudioCanPlay = (index) => {
  audioLoadingStates.value[index] = false;
};

const onAudioError = (index, error) => {
  console.error('Ошибка загрузки аудио:', error);
  audioLoadingStates.value[index] = false;
  toast.error('Ошибка при загрузке аудио');
};

const formatTools = [
  { icon: 'fas fa-bold', format: 'bold', tooltip: 'Жирный' },
  { icon: 'fas fa-italic', format: 'italic', tooltip: 'Курсив' },
  { icon: 'fas fa-quote-right', format: 'quote', tooltip: 'Цитата' },
  { icon: 'fas fa-code', format: 'code', tooltip: 'Код' }
];

const showEmojiPicker = ref(false);
const emojiPickerPosition = ref({ x: 0, y: 0 });

// Функция для открытия окна с эмодзи
const openEmojiPicker = (event) => {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  emojiPickerPosition.value = {
    x: rect.left,
    y: rect.bottom + 5
  };
  showEmojiPicker.value = true;
};

// Функция для обработки выбора эмодзи
const handleEmojiSelect = (emoji) => {
  const selection = window.getSelection();
  let range;
  
  // Проверяем, есть ли активное выделение
  if (selection.rangeCount === 0) {
    // Если нет, создаем новый диапазон в конце редактора
    range = document.createRange();
    const editor = document.querySelector('[contenteditable="true"]');
    range.selectNodeContents(editor);
    range.collapse(false); // перемещаем курсор в конец
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    range = selection.getRangeAt(0);
  }
  
  const textNode = document.createTextNode(emoji);
  range.deleteContents();
  range.insertNode(textNode);
  
  // Перемещаем курсор после вставленного эмодзи
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Обновляем значение postContent
  postContent.value = editor.value.innerHTML;
  
  // Фокусируемся на редакторе
  nextTick(() => {
    editor.value.focus();
  });
};

const applyFormat = (format) => {
  console.log('applyFormat called with:', format);
  document.execCommand(format, false, null);
  editor.value.focus();
};

const removeAudio = (index) => {
  store.dispatch('music/removeAudio', index);
};

async function submitPost() {
  console.log('[CreatePost] Начало процесса создания поста');
  
  // Проверяем заголовок
  if (!postTitle.value?.trim()) {
    toast.error('Заголовок не может быть пустым');
    return;
  }

  // Проверяем содержание
  const editor = document.querySelector('[contenteditable="true"]');
  const content = editor?.textContent?.trim();
  if (!content) {
    toast.error('Содержание поста не может быть пустым');
    return;
  }

  // Проверяем категорию
  if (!categoryId.value) {
    toast.error('Выберите категорию');
    return;
  }

  try {
    console.log('[CreatePost] Подготовка данных поста');
    
    const postData = {
      title: postTitle.value.trim(),
      content: editor.innerHTML,
      categoryId: categoryId.value,
      pictures: store.state.picture.uploadedImages,
      videos: store.state.video.uploadedVideos,
      audio: store.state.music.uploadedAudio,
      documents: store.state.format.uploadedFiles,
      tags: tags.value,
      createdAt: new Date().toISOString()
    };

    console.log('[CreatePost] Отправка данных в store:', postData);
    const postId = await store.dispatch('create/createPost', postData);
    console.log('[CreatePost] Пост успешно создан, ID:', postId);

    // Очищаем форму
    clearForm();
    
    // Показываем уведомление об успехе
    toast.success('Пост успешно создан');

    // Перенаправляем на страницу поста
    router.push({ name: 'PostDetails', params: { id: postId } });
  } catch (error) {
    console.error('[CreatePost] Ошибка при создании поста:', error);
    toast.error('Ошибка при создании поста: ' + error.message);
  }
}

function removeTag(index) {
  tags.value.splice(index, 1);
}

async function handleFileUpload(event) {
  const files = event.target.files;
  if (!files.length) return;

  try {
    // Проверяем общее количество изображений
    const currentImages = store.state.picture.uploadedImages || [];
    const totalImagesAfterUpload = currentImages.length + files.length;
    
    if (totalImagesAfterUpload > 10) {
      toast.error('Нельзя загрузить больше 10 изображений');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Можно загружать только изображения');
        continue;
      }

      // Загружаем изображение через Vuex action
      const imageUrl = await store.dispatch('picture/uploadImage', file);
      
      if (imageUrl) {
        console.log('Изображение успешно загружено:', imageUrl);
        // Добавляем небольшую задержку перед отображением
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error('Ошибка при загрузке изображения:', error);
    toast.error('Не удалось загрузить изображение');
  }
}

// Функция для обработки загрузки видео
const handleVideoUpload = async (event) => {
  const files = Array.from(event.target.files);
  const maxSize = 20 * 1024 * 1024;

  for (const videoFile of files) {
    try {
      if (videoFile.size > maxSize) {
        toast.info('Видео превышает 20MB, начинаем сжатие...');
        const compressedVideo = await videoCompressor.value.compressVideo(videoFile);

        if (compressedVideo.size > maxSize) {
          toast.error('Видео слишком большое даже после сжатия');
          return;
        }
        toast.success(`Видео сжато (${(compressedVideo.size / 1024 / 1024).toFixed(2)}MB)`);
        await store.dispatch('video/uploadVideo', compressedVideo);
      } else {
        await store.dispatch('video/uploadVideo', videoFile);
      }
    } catch (error) {
      console.error('Error handling video upload:', error);
      toast.error('Произошла ошибка при обработке видео');
    }
  }
  event.target.value = '';
};

const handleAudioUpload = async (event) => {
  console.group('🎵 Обработка загрузки аудио');
  console.log('⏰ Время начала:', new Date().toISOString());

  try {
    if (!event.target || !event.target.files) {
      throw new Error('Не удалось получить файлы');
    }

    const files = Array.from(event.target.files);
    console.log('📁 Выбранные файлы:', files.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));

    if (files.length === 0) {
      throw new Error('Файлы не выбраны');
    }

    isAudioUploading.value = true;

    for (const file of files) {
      try {
        console.log('📄 Обработка файла:', {
          name: file.name,
          type: file.type,
          size: file.size
        });

        const result = await store.dispatch('music/uploadAudio', file);
        
        if (result.success) {
          console.log('✅ Файл успешно загружен:', result.message);
          toast.success(result.message);
          // Обновляем состояние загрузки для нового файла
          audioLoadingStates.value.push(true);
        } else {
          console.error('❌ Ошибка при загрузке:', result.message);
          toast.error(result.message);
        }
      } catch (uploadError) {
        console.error('❌ Ошибка при загрузке файла:', uploadError);
        toast.error(uploadError.message || `Ошибка при загрузке файла ${file.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Общая ошибка обработки:', error);
    toast.error(error.message || 'Произошла ошибка при обработке аудио файлов');
  } finally {
    isAudioUploading.value = false;
  }

  if (audioInput.value) {
    audioInput.value.value = '';
  }

  console.groupEnd();
};

async function removeFormat(index) {
  console.group('🗑️ Удаление документа');
  try {
    console.log('📄 Начало удаления документа с индексом:', index);
    
    const result = await store.dispatch('format/removeFile', index);
    
    if (result.success) {
      console.log('✅ Документ успешно удален');
      toast.success(result.message);
    } else {
      console.error('❌ Ошибка при удалении документа:', result.message);
      toast.error(result.message);
    }
  } catch (error) {
    console.error('❌ Ошибка при удалении документа:', error);
    toast.error('Не удалось удалить документ');
  } finally {
    console.groupEnd();
  }
};

// Функция добавления тега
const addTag = async () => {
  const tag = tagInput.value.trim();
  if (tag && tag.length > 0) {
    const result = await store.dispatch('tegs/addTag', tag);
    if (result.success) {
      tagInput.value = '';
    } else {
      toast.warning(result.message);
    }
  }
};

// Очистка тегов при размонтировании компонента
onUnmounted(() => {
  store.dispatch('tegs/clearTags');
});
const triggerVideoUpload = () => {
  console.log('triggerVideoUpload called');
  videoInput.value.click();
};

const triggerAudioUpload = () => {
  console.log('triggerAudioUpload called');
  audioInput.value.click();
};

const triggerFormatUpload = () => {
  console.group('📂 Процесс загрузки документов');
  console.log('🔘 Кнопка загрузки документов нажата');
  
  try {
    if (!formatInput.value) {
      throw new Error('Элемент input не найден');
    }
    
    console.log('✨ Элемент input найден:', formatInput.value);
    console.log('📊 Текущее состояние:', {
      filesCount: store.state.format.uploadedFiles.length,
      inputValue: formatInput.value.value,
      inputFiles: formatInput.value.files
    });

    formatInput.value.click();
    console.log('🖱️ Вызван клик на скрытом input элементе');
  } catch (error) {
    console.error('❌ Ошибка при попытке открыть диалог выбора файла:', error);
    toast.error('Не удалось открыть диалог выбора файла');
  } finally {
    console.groupEnd();
  }
};

const triggerImageUpload = () => {
  console.log('triggerImageUpload called');
  if (!imageInput.value) {
    console.error('Поле для загрузки изображений не найдено');
    return;
  }
  imageInput.value.click();
};

const handleFormatUpload = async (event) => {
  console.group('📄 Загрузка документов');
  try {
    if (!event.target || !event.target.files) {
      throw new Error('Не удалось получить файлы');
    }

    const files = Array.from(event.target.files);
    if (files.length === 0) {
      throw new Error('Файлы не выбраны');
    }

    console.log('📦 Выбранные файлы:', files.map(f => ({
      name: f.name,
      type: f.type,
      size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`
    })));

    for (const file of files) {
      try {
        console.log(`⬆️ Загрузка файла: ${file.name}`);
        const result = await store.dispatch('format/uploadFile', file);
        
        if (result.success) {
          console.log(`✅ Файл ${file.name} успешно загружен`);
          toast.success(result.message);
        } else {
          console.error(`❌ Ошибка загрузки файла ${file.name}:`, result.message);
          toast.error(result.message);
        }
      } catch (error) {
        console.error(`❌ Ошибка при загрузке файла ${file.name}:`, error);
        toast.error(error.message || `Ошибка при загрузке файла ${file.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Общая ошибка загрузки:', error);
    toast.error(error.message || 'Произошла ошибка при загрузке документов');
  } finally {
    if (formatInput.value) {
      formatInput.value.value = '';
    }
    console.groupEnd();
  }
};

function handleImageLoad(event) {
  console.log('Изображение успешно загружено:', event.target.src);
}

function handleImageError(event) {
  console.error('Ошибка загрузки изображения:', event.target.src);
  toast.error('Не удалось загрузить изображение');
}

async function handleImageRemove(index) {
  try {
    // Удаляем из store
    store.commit('picture/REMOVE_IMAGE', index);
    
    // Обновляем Firebase
    const userId = localStorage.getItem('userId') || 'default';
    const imagesRef = databaseRef(database, `users/${userId}/images`);
    await set(imagesRef, store.state.picture.uploadedImages);
    
    toast.success('Изображение удалено');
  } catch (error) {
    console.error('Ошибка при удалении изображения:', error);
    toast.error('Не удалось удалить изображение');
  }
}

const removeVideo = (index) => {
  try {
    store.commit('video/REMOVE_VIDEO', index);
    toast.success('Видео успешно удалено');
  } catch (error) {
    console.error('Ошибка при удалении видео:', error);
    toast.error('Ошибка при удалении видео');
  }
};

const getVideoFileName = (url) => {
  console.log('getVideoFileName вызван с URL:', url);
  if (!url) {
    console.log('URL пустой, возвращаем пустую строку');
    return '';
  }
  try {
    console.log('Разбираем URL на части');
    const urlParts = url.split('/');
    console.log('Части URL:', urlParts);
    const fileName = urlParts[urlParts.length - 1];
    console.log('Извлеченное имя файла:', fileName);
    const decodedFileName = decodeURIComponent(fileName);
    console.log('Декодированное имя файла:', decodedFileName);
    return decodedFileName;
  } catch (error) {
    console.error('Ошибка при получении имени файла:', error);
    console.error('URL, вызвавший ошибку:', url);
    return 'Неизвестный файл';
  }
};

// Функция для получения имени файла из URL аудио с логированием
const getAudioFileName = (url) => {
  console.log('getAudioFileName вызван с URL:', url);
  if (!url) {
    console.log('URL аудио пустой, возвращаем пустую строку');
    return '';
  }
  try {
    console.log('Разбираем URL аудио на части');
    const urlParts = url.split('/');
    console.log('Части URL аудио:', urlParts);
    const fileName = urlParts[urlParts.length - 1];
    console.log('Извлеченное имя аудио файла:', fileName);
    const decodedFileName = decodeURIComponent(fileName);
    console.log('Декодированное имя аудио файла:', decodedFileName);
    return decodedFileName;
  } catch (error) {
    console.error('Ошибка при получении имени аудио файла:', error);
    console.error('URL аудио, вызвавший ошибку:', url);
    return 'Неизвестный аудио файл';
  }
};

// Логируем загруженные видео при монтировании компонента
onMounted(() => {
  console.log('Компонент CreatePost смонтирован');
  console.log('Загруженные видео:', store.state.video.uploadedVideos);
});

// Следим за изменениями в store
watch(() => store.state.picture.uploadedImages, (newImages) => {
  console.log('Обновлен список изображений:', newImages);
}, { deep: true });

// Обработчик ввода для заголовка
const handleTitleInput = (event) => {
  if (postTitle.value.length >= 33) {
    postTitle.value = postTitle.value.slice(0, 33);
    event.preventDefault();
  }
  showValidation.value = true;
};

// Обработчик ввода для контента
const handleInput = (event) => {
  // Получаем текст и удаляем пробелы по краям
  const content = event.target.innerText.trim();
  console.log('Input event:', {
    rawContent: event.target.innerText,
    trimmedContent: content,
    length: content.length
  });
  
  // Проверяем длину после удаления пробелов
  if (content.length > 333) {
    event.preventDefault();
    const truncated = content.slice(0, 333);
    event.target.innerText = truncated;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(event.target);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  
  // Обновляем значение контента
  postContent.value = content;
  showValidation.value = true;
  
  nextTick(() => {
    console.log('After update:', {
      content: postContent.value,
      length: postContent.value.length,
      isFormValid: isFormValid.value
    });
  });
};

const showValidation = ref(false);

// Проверка валидности формы
const isFormValid = computed(() => {
  const titleValid = postTitle.value.trim().length > 0;
  const contentValid = postContent.value.length > 0; // Используем длину после trim() из handleInput
  
  console.log('Form validation:', {
    titleValid,
    contentValid,
    title: postTitle.value,
    content: postContent.value,
    isValid: titleValid && contentValid
  });
  
  return titleValid && contentValid;
});

// Функция валидации и отправки
const validateAndSubmit = () => {
  showValidation.value = true;
  
  if (!postTitle.value.trim()) {
    toast.error('Пожалуйста, введите заголовок');
    return;
  }

  if (!postContent.value.trim()) {
    toast.error('Пожалуйста, добавьте содержание');
    return;
  }

  submitPost();
};

// Состояние для режима предпросмотра
const previewMode = ref(false);

// Функция для переключения режима предпросмотра
const togglePreview = () => {
  previewMode.value = !previewMode.value;
};

// Функция очистки формы
const clearForm = async () => {
  console.log('[CreatePost] Очистка формы');
  
  // Очищаем основные поля
  postTitle.value = '';
  if (editor.value) editor.value.innerHTML = '';
  tags.value = [];
  // Очищаем загруженные файлы
  await Promise.all([
    store.dispatch('picture/clearImages'),
    store.dispatch('music/clearAudio'),
    store.dispatch('video/clearVideos'),
    store.dispatch('format/clearFiles')
  ]);
  
  // Увеличиваем прогресс
  store.dispatch('progress/incrementPosts');
};

// Добавляем watcher для отслеживания изменений
watch(() => postContent.value, (newValue) => {
  console.log('=== postContent changed ===', newValue);
});

watch(() => isFormValid.value, (newValue) => {
  console.log('=== isFormValid changed ===', newValue);
});
</script>

<style scoped>
.video-player {
  --plyr-color-main: #8B5CF6;
  --plyr-video-background: #1F2937;
  --plyr-menu-background: #374151;
  --plyr-menu-color: #F3F4F6;
  --plyr-tooltip-background: #374151;
  --plyr-tooltip-color: #F3F4F6;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.video-player:hover {
  --plyr-video-controls-background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.7));
}

.text-bold {
  font-weight: bold;
}
.text-italic {
  font-style: italic;
}
.text-underline {
  text-decoration: underline;
}
.text-strike {
  text-decoration: line-through;
}
.text-code {
  font-family: monospace;
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 3px;
}

.image-preview {
  position: relative;
  z-index: 1;
}

.image-preview img {
  transition: all 0.3s ease-in-out;
}

.image-preview:hover {
  z-index: 10;
}

.image-preview:hover img {
  transform: scale(1.5);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

textarea {
  white-space: pre-wrap !important;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  min-height: 300px;
  resize: vertical;
}

.post-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
}
.plyr {
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.plyr--video {
  height: 100%;
}

.plyr__video-wrapper {
  height: 100%;
}

.plyr video {
  object-fit: cover;
  height: 100%;
}
</style>