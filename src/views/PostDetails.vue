<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 p-4 sm:p-6 md:p-8">
    <!-- Кнопка назад -->
    <div class="max-w-4xl mx-auto">
      <button @click="goBack" 
              class="group mb-6 flex items-center space-x-2 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors duration-300">
        <i class="fas fa-arrow-left transform group-hover:-translate-x-1 transition-transform duration-300"></i>
        <span class="text-sm font-medium">Назад</span>
      </button>

      <!-- Загрузка -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto"></div>
      </div>

      <!-- Основная карточка поста -->
      <div v-else-if="post" class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <!-- Шапка поста -->
        <div class="p-6 border-b border-gray-100 dark:border-gray-700">
          <div class="flex items-start space-x-6">
            <!-- Аватар и информация об авторе -->
            <div class="flex-shrink-0 group">
              <div class="relative ml-7">
                <img :src="authorData.avatar || '/image/empty_avatar.png'"
                     :alt="authorData.name"
                     class="w-20 h-20 rounded-full object-cover ring-4 ring-purple-500/30 group-hover:ring-purple-500/50 transition-all duration-300"
                     @error="handleAvatarError">
              </div>
              <div class="mt-3 text-center">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ authorData.name }}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ authorData.signature }}</p>
              </div>
            </div>

            <!-- Основная информация -->
            <div class="flex-1">
              <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                {{ post.title }}
              </h1>
              
              <!-- Метаданные -->
              <div class="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                <span class="flex items-center">
                  <i class="fas fa-calendar-alt mr-2"></i>
                  {{ formatDate(post.createdAt) }}
                </span>
                <span class="flex items-center">
                  <i class="fas fa-clock mr-2"></i>
                  {{ formatTime(post.createdAt) }}
                </span>
              </div>

              <!-- Теги -->
              <div v-if="post.tags && post.tags.length" class="mt-4 flex flex-wrap gap-2">
                <span v-for="tag in post.tags" 
                      :key="tag"
                      class="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-full text-sm">
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Содержимое поста -->
        <div class="p-6">
          <!-- Текст поста -->
          <div class="prose dark:prose-invert max-w-none" v-html="post.content"></div>

          <!-- Изображения -->
          <div v-if="post.pictures" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            <div v-for="(image, index) in Object.values(post.pictures)" :key="index" class="relative group">
              <img 
                :src="getImageUrl(image)"
                class="w-full h-48 object-cover rounded-lg shadow-md"
                :alt="'Изображение ' + (index + 1)"
                @error="handleImageError"
              >
            </div>
          </div>

          <!-- Видео -->
          <div v-if="post.videos && post.videos.length" class="mt-6 space-y-4">
            <div v-for="(video, index) in post.videos" 
                 :key="index"
                 class="relative">
              <video 
                :src="video"
                class="w-full rounded-lg"
                controls
                preload="metadata">
              </video>
            </div>
          </div>

          <!-- Аудио -->
          <div v-if="post.audio && post.audio.length" class="mt-6 space-y-4">
            <div v-for="(audioFile, index) in post.audio" 
                 :key="index"
                 class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <audio 
                :src="audioFile"
                class="w-full"
                controls
                preload="metadata">
              </audio>
            </div>
          </div>

          <!-- Документы -->
          <div v-if="post.documents && post.documents.length" class="mt-6 space-y-3">
            <div v-for="(doc, index) in post.documents" 
                 :key="index"
                 class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-300">
              <div class="flex items-center space-x-3">
                <i class="fas fa-file-alt text-2xl text-purple-500"></i>
                <div>
                  <span class="text-gray-900 dark:text-white font-medium">{{ doc.name || `Документ ${index + 1}` }}</span>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ formatFileSize(doc.size) }}</p>
                </div>
              </div>
              <button @click="downloadDocument(doc.url, doc.name)"
                      class="flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-300">
                <i class="fas fa-download"></i>
                <span>Скачать</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Действия с постом -->
        <div class="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button @click="toggleLike" 
                      class="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors duration-300">
                <i class="fas fa-heart"></i>
                <span>{{ post.likes || 0 }}</span>
              </button>
              <button class="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors duration-300"
                      @click="focusComment">
                <i class="fas fa-comment"></i>
                <span>{{ comments.length }}</span>
              </button>
            </div>
            <button @click="sharePost" 
                    class="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">
              <i class="fas fa-share-alt"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Секция комментариев -->
      <div class="mt-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <i class="fas fa-comments mr-3 text-purple-500"></i>
          Комментарии
          <span class="ml-3 text-sm font-normal text-gray-500 dark:text-gray-400">
            ({{ comments.length }})
          </span>
        </h2>

        <!-- Список комментариев -->
        <div class="space-y-6">
          <div
            v-for="comment in pagedComments"
            :key="comment.id"
            class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg"
          >
            <div class="p-6">
              <div class="flex items-start space-x-4">
                <!-- Аватар -->
                <img 
                  :src="comment.author?.avatarUrl || '/image/empty_avatar.png'"
                  :alt="comment.author?.username || 'Гость'"
                  class="w-12 h-12 rounded-full object-cover"
                  @error="handleAvatarError"
                >

                <div class="flex-1">
                  <!-- Информация об авторе -->
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                        {{ comment.author?.username || 'Гость' }}
                      </h3>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ comment.author?.signature || 'Участник форума' }}
                      </p>
                    </div>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(comment.createdAt) }}
                    </span>
                  </div>

                  <!-- Текст комментария -->
                  <div class="mt-4 text-gray-600 dark:text-gray-300">
                    {{ comment.content }}
                  </div>

                  <!-- Действия -->
                  <div class="mt-4 flex items-center space-x-4">
                    <button 
                      @click="likeComment(comment.id)"
                      class="text-sm flex items-center space-x-2 text-gray-500 hover:text-red-500"
                    >
                      <i class="fas fa-heart"></i>
                      <span>{{ comment.likes || 0 }}</span>
                    </button>
                    <button 
                      @click="replyToComment(comment.id)"
                      class="text-sm flex items-center space-x-2 text-gray-500 hover:text-blue-500"
                    >
                      <i class="fas fa-reply"></i>
                      <span>Ответить</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Ответы -->
            <div v-if="comment.replies?.length" class="border-t border-gray-100 dark:border-gray-700">
              <div 
                v-for="reply in comment.replies" 
                :key="reply.id"
                class="p-4 pl-16 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <div class="flex items-start space-x-3">
                  <img 
                    :src="reply.author?.avatarUrl || '/image/empty_avatar.png'"
                    :alt="reply.author?.username || 'Гость'"
                    class="w-8 h-8 rounded-full object-cover"
                    @error="handleAvatarError"
                  >
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <h4 class="font-medium text-gray-900 dark:text-white">
                        {{ reply.author?.username || 'Гость' }}
                      </h4>
                      <span class="text-sm text-gray-500">
                        {{ formatDate(reply.createdAt) }}
                      </span>
                    </div>
                    <p class="mt-1 text-gray-600 dark:text-gray-300">
                      {{ reply.content }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Нет комментариев -->
          <div 
            v-if="!comments.length"
            class="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm"
          >
            <i class="far fa-comments text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
            <p class="text-gray-500 dark:text-gray-400">
              Будьте первым, кто оставит комментарий!
            </p>
          </div>
        </div>

        <!-- Pagination -->
        <Pagination 
          v-if="comments.length > itemsPerPage"
          :total-items="comments.length"
          :items-per-page="itemsPerPage"
        />
      </div>

      <!-- Форма ответа -->
      <div class="mt-6">
        <h2 class="text-2xl font-bold mb-4">Ответить</h2>
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 transition-transform duration-300 hover:scale-105">
          <div class="flex items-center space-x-4">
            <div class="relative group">
              <img :src="currentUser.avatarUrl || '/image/empty_avatar.png'" 
                   :alt="currentUser.username || 'Гость'" 
                   @error="handleAvatarError"
                   class="w-14 h-14 rounded-full object-cover border-2 border-purple-500 shadow-md transition-transform duration-300 group-hover:scale-110">
              <div v-if="isUserOnline" class="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
            </div>
            <div class="flex-1">
              <div class="text-lg font-semibold text-gray-900 dark:text-white">{{ currentUser.username || 'Гость' }}</div>
              <div class="text-sm text-purple-600 dark:text-purple-400 font-medium">@{{ currentUser.username || 'anonymous' }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 italic transition-opacity duration-300 hover:opacity-80">{{ currentUser.signature || 'Участник форума' }}</div>
              
              <div ref="commentEditor" contenteditable="true" 
                   class="mt-3 p-4 border border-gray-200 dark:border-gray-700 rounded-t-2xl bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow duration-300 shadow-sm hover:shadow-lg min-h-[100px] w-[600px] overflow-hidden relative"
                   @input="handleCommentInput"
                   @keydown="handleKeyDown">
                <div v-if="!commentContent" class="absolute top-4 left-4 flex items-center pointer-events-none">
                  <span class="text-gray-400 text-xl">&#128172;</span>
                  <span class="pl-2 text-gray-600 dark:text-gray-300">Напишите ваш комментарий...</span>
                </div>
                <div class="break-words whitespace-pre-wrap">{{ commentContent }}</div>
              </div>
              
              <!-- Счетчик символов -->
              <div class="flex justify-end w-[600px]">
                <div class="inline-flex items-center space-x-1.5 text-sm px-4 py-1.5 rounded-b-xl border-x border-b"
                     :class="{
                       'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800': remainingChars <= 0,
                       'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800': remainingChars <= 50 && remainingChars > 0,
                       'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700': remainingChars > 50
                     }">
                  <span class="font-mono font-medium">{{ remainingChars }}</span>
                  <span class="font-medium tracking-tight">символов осталось</span>
                </div>
              </div>
              
              <div class="flex items-center justify-between p-8 space-x-2">
                <div class="flex items-center space-x-3">
                  <button @click="openEmojiPicker" class="text-gray-500 hover:text-purple-500 transition-colors duration-300 text-xl">
                    <i class="fas fa-smile"></i>
                  </button>
                  <button @click="triggerImageUpload" class="text-gray-500 hover:text-purple-500 transition-colors duration-300 text-xl">
                    <i class="fas fa-image"></i>
                  </button>
                  <button @click="triggerVideoUpload" class="text-gray-500 hover:text-purple-500 transition-colors duration-300 text-xl">
                    <i class="fas fa-video"></i>
                  </button>
                  <button @click="attachGif" class="text-gray-500 hover:text-purple-500 transition-colors duration-300 text-xl">
                    <i class="fas fa-gift"></i>
                  </button>
                </div>
                <button @click="submitComment" 
                        class="px-4 py-2 bg-purple-600 text-white rounded-full shadow-md hover:bg-purple-700 dark:hover:bg-purple-500 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2">
                  <i class="fas fa-paper-plane"></i>
                  <span>Отправить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { useToast } from 'vue-toastification';
import Pagination from '../components/Pagination.vue';

const store = useStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

// Состояния
const post = ref(null);
const comments = computed(() => store.getters['comments/getComments'] || []);
const newComment = ref('');
const showActions = ref(false);
const isLoading = ref(true);

const MAX_CHARS = 333;
const commentContent = ref('');
const remainingChars = computed(() => MAX_CHARS - (commentContent.value?.length || 0));

const itemsPerPage = 10;
const currentPage = computed(() => store.getters['pagination/getCurrentPage']);

const pagedComments = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return comments.value.slice(start, end);
});

// Existing refs and imports...

// Получаем данные поста и автора
onMounted(async () => {
  const postId = route.params.id;
  try {
    isLoading.value = true;
    
    // Загружаем пост (теперь включает данные автора)
    const postData = await store.dispatch('posts/fetchPostById', postId);
    post.value = postData;
    
    // Загружаем комментарии
    const commentsData = await store.dispatch('comments/fetchComments', postId);
    comments.value = commentsData || [];
    
    isLoading.value = false;
  } catch (error) {
    console.error('Error loading post:', error);
    isLoading.value = false;
  }
});

// Обновляем вычисляемое свойство для данных автора
const authorData = computed(() => {
  if (post.value?.author) {
    return {
      name: post.value.author.username || currentUser.value.username || 'Гость',
      avatar: post.value.author.avatarUrl || currentUser.value.avatarUrl || '/image/empty_avatar.png',
      signature: post.value.author.signature || currentUser.value.signature || 'Участник форума'
    };
  }
  return {
    name: currentUser.value.username || 'Гость',
    avatar: currentUser.value.avatarUrl || '/image/empty_avatar.png',
    signature: currentUser.value.signature || 'Участник форума'
  };
});

// Получаем информацию о текущем пользователе из Vuex store
const currentUser = computed(() => {
  const profile = store.state.profile.profile;
  return {
    username: profile.username || '',
    avatarUrl: profile.avatarUrl || '/image/empty_avatar.png',
    signature: profile.signature || 'Участник форума'
  };
});

// Проверяем онлайн-статус пользователя
const isUserOnline = computed(() => store.state.auth.status === 'authenticated');

// Переменные для формы комментария
const commentEditor = ref(null);
const commentImages = ref([]);

// Инструменты форматирования
const formatTools = [
  { icon: 'fas fa-bold', format: 'bold', tooltip: 'Жирный' },
  { icon: 'fas fa-italic', format: 'italic', tooltip: 'Курсив' },
  { icon: 'fas fa-underline', format: 'underline', tooltip: 'Подчеркнутый' },
  { icon: 'fas fa-quote-right', format: 'quote', tooltip: 'Цитата' }
];

// Методы для работы с редактором
const applyFormat = (format) => {
  document.execCommand(format, false, null);
  commentEditor.value.focus();
};

const handleCommentInput = (event) => {
  const content = event.target.innerText;
  if (content.length > MAX_CHARS) {
    // Prevent further input if over limit
    event.preventDefault();
    const selection = window.getSelection();
    const range = document.createRange();
    const textNode = event.target.firstChild;
    range.setStart(textNode, MAX_CHARS);
    range.setEnd(textNode, content.length);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('delete', false);
    return;
  }
  commentContent.value = content;
};

const handleKeyDown = (event) => {
  if (remainingChars.value <= 0 && !event.ctrlKey && !event.metaKey && 
      event.key !== 'Backspace' && event.key !== 'Delete' && 
      event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && 
      event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    event.preventDefault();
  }
};

const openEmojiPicker = () => {
  // Реализация открытия окна с эмодзи
  console.log('Открытие окна с эмодзи');
};

const triggerImageUpload = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        // Загружаем изображение в Firebase Storage
        const imageUrl = await store.dispatch('uploadImage', file);
        commentImages.value.push(imageUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Ошибка при загрузке изображения');
      }
    }
  };
  input.click();
};

const triggerVideoUpload = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'video/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Загружаем видео в Firebase Storage
        const videoUrl = await store.dispatch('uploadVideo', file);
        commentImages.value.push({ type: 'video', url: videoUrl });
      } catch (error) {
        console.error('Error uploading video:', error);
        toast.error('Ошибка при загрузке видео');
      }
    }
  };
  input.click();
};

const removeCommentImage = (index) => {
  commentImages.value.splice(index, 1);
};

const handleImageError = (event) => {
  event.target.src = '/image/error-placeholder.png';
};

const handleAvatarError = (event) => {
  event.target.src = '/image/empty_avatar.png';
};

const submitComment = async () => {
  try {
    if (!commentContent.value.trim()) {
      toast.warning('Пожалуйста, введите текст комментария');
      return;
    }

    // Проверяем авторизацию
    const currentUser = store.state.auth.user;
    if (!currentUser || !currentUser.uid) {
      toast.error('Пожалуйста, войдите в систему, чтобы оставить комментарий');
      return;
    }

    const commentData = {
      postId: post.value.id,
      content: commentContent.value.trim(),
      attachments: commentImages.value,
      createdAt: new Date().toISOString(),
      userId: currentUser.uid
    };

    await store.dispatch('comments/addComment', {
      postId: route.params.id,
      content: commentContent.value.trim()
    });
    
    // Очищаем форму
    commentContent.value = '';
    commentImages.value = [];
    if (commentEditor.value) {
      commentEditor.value.innerHTML = '';
    }

    toast.success('Комментарий успешно добавлен!');
  } catch (error) {
    console.error('Error submitting comment:', error);
    toast.error('Не удалось отправить комментарий');
  }
};

// Методы
const goBack = () => {
  router.back();
};

const toggleLike = async () => {
  try {
    await store.dispatch('posts/toggleLike', post.value.id);
  } catch (error) {
    console.error('Error toggling like:', error);
  }
};

const focusComment = () => {
  const commentInput = document.querySelector('#comment-input');
  if (commentInput) {
    commentInput.focus();
  }
};

const sharePost = async () => {
  try {
    await navigator.share({
      title: post.value.title,
      text: post.value.content,
      url: window.location.href
    });
  } catch (error) {
    console.error('Error sharing post:', error);
  }
};

const likeComment = async (commentId) => {
  try {
    await store.dispatch('comments/likeComment', {
      postId: route.params.id,
      commentId
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    toast.error('Не удалось поставить лайк');
  }
};

const replyToComment = (commentId) => {
  // Реализация ответа на комментарий
  console.log('Ответ на комментарий:', commentId);
};

const canEditComment = (comment) => {
  // Реализация проверки возможности редактирования комментария
  console.log('Проверка возможности редактирования комментария:', comment);
  return true;
};

const editComment = (commentId) => {
  // Реализация редактирования комментария
  console.log('Редактирование комментария:', commentId);
};

const openMediaPreview = (url) => {
  // Реализация открытия медиа-превью
  console.log('Открытие медиа-превью:', url);
};

const downloadDocument = async (url, fileName) => {
  try {
    // Показываем индикатор загрузки
    const downloadingToast = toast.info('Загрузка документа...', {
      timeout: false,
      closeOnClick: false,
      draggable: false
    });
    
    // Получаем файл
    const response = await fetch(url);
    if (!response.ok) throw new Error('Ошибка при загрузке файла');
    
    // Создаем blob из ответа
    const blob = await response.blob();
    
    // Создаем ссылку для скачивания
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || 'document';
    
    // Добавляем ссылку в DOM и эмулируем клик
    document.body.appendChild(link);
    link.click();
    
    // Удаляем ссылку и освобождаем URL
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    // Закрываем toast загрузки и показываем успех
    toast.dismiss(downloadingToast);
    toast.success('Документ успешно скачан');
  } catch (error) {
    console.error('Ошибка при скачивании:', error);
    toast.error('Ошибка при скачивании документа');
  }
};

// Форматирование даты и времени
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatFileSize = (size) => {
  if (!size) return '';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  const index = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
};

const getImageUrl = (image) => {
  if (!image) return '';
  return image;
};

const getCharacterCountText = (chars) => {
  if (chars <= 0) return 'Символов не осталось';
  if (chars <= 50) return 'Символов осталось мало';
  return 'Символов осталось много';
};
</script>

<style scoped>
.comment-list-enter-active,
.comment-list-leave-active,
.reply-list-enter-active,
.reply-list-leave-active {
  transition: all 0.5s ease;
}

.comment-list-enter-from,
.comment-list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.reply-list-enter-from,
.reply-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.prose :deep(p) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.prose :deep(a) {
  color: #6366f1;
  text-decoration: none;
  transition: color 0.2s;
}

.prose :deep(a:hover) {
  color: #4f46e5;
}
</style>
