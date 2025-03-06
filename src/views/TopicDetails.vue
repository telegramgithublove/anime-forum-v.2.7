<template>
  <div class="min-h-screen bg-gradient-to-r from-purple-600 to-blue-500 p-6">
    <div class="max-w-6xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <div class="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-8 transition-all duration-300 relative">
        <!-- Кнопка возврата -->
        <router-link 
          to="/"
          class="absolute top-6 left-6 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg transform transition-all duration-200 hover:scale-110 hover:bg-purple-700 z-10"
        >
          <i class="fas fa-arrow-left"></i>
        </router-link>

        <!-- Заголовок и дата -->
        <header class="text-center mt-8">
          <!-- Информация об авторе -->
          <div v-if="currentTopic" class="absolute top-6 right-6 flex items-center space-x-4 group">
            <div class="flex flex-col items-end">
              <router-link 
                :to="`/profile/${currentTopic.userId}`"
                class="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors duration-200 group-hover:text-purple-600"
              >
                {{ authorUsername }}
              </router-link>
              <span class="text-xs text-gray-400">Автор поста</span>
            </div>
            <router-link 
              :to="`/profile/${currentTopic.userId}`"
              class="relative transform transition-all duration-300 hover:scale-110"
            >
              <img
                :src="authorAvatar"
                :alt="authorUsername"
                class="w-12 h-12 rounded-full object-cover ring-2 ring-purple-400 ring-offset-2 shadow-lg"
              />
              <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm"></div>
            </router-link>
          </div>

          <!-- Состояние загрузки -->
          <div v-if="isLoadingState" class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>

          <!-- Ошибка -->
          <div v-else-if="errorState" class="text-center py-8">
            <p class="text-red-500">{{ errorState }}</p>
            <button @click="loadTopic" class="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Попробовать снова
            </button>
          </div>

          <!-- Контент -->
          <template v-else-if="currentTopic">
            <h2 class="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {{ currentTopic.title }}
            </h2>
            <p class="text-sm text-gray-400 mt-2 font-medium">{{ formattedDate }}</p>
          </template>
        </header>

        <!-- Область мультимедиа с эффектом увеличения -->
        <div v-if="currentTopic?.picture" class="flex justify-center mt-6 relative z-[111]">
          <div class="relative group w-[280px] h-[280px] rounded-xl">
            <img
              :src="currentTopic.picture"
              alt="Изображение к теме"
              class="w-full h-full object-cover rounded-xl shadow-lg transform transition-all duration-500 ease-out group-hover:scale-150 origin-center"
            />
          </div>
        </div>

        <!-- Блок для контента -->
        <div class="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 shadow-inner mt-8">
          <div class="text-gray-700 text-lg leading-relaxed space-y-4">
            <p class="font-medium tracking-wide whitespace-pre-wrap" style="min-height: 12em; max-height: 16em; overflow-y: auto;">
              {{ truncatedContent }}
            </p>
          </div>
          <div class="absolute top-6 right-6 text-purple-400">
            <i class="fas fa-quote-right text-2xl opacity-50"></i>
          </div>
          <div class="absolute bottom-6 right-6">
            <span class="text-sm text-purple-400">{{ currentTopic?.content?.length || 0 }}/555</span>
          </div>
        </div>

        <!-- Кнопки действий -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
          <button
            class="flex items-center justify-center px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-all duration-200 hover:scale-105 space-x-1.5"
            @click="handleAddFriend"
          >
            <i class="fas fa-user-plus text-sm"></i>
            <span>Добавить</span>
          </button>

          <button
            class="flex items-center justify-center px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-all duration-200 hover:scale-105 space-x-1.5"
            @click="handleMessage"
          >
            <i class="fas fa-comment text-sm"></i>
            <span>Написать</span>
          </button>

          <button
            class="flex items-center justify-center px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-all duration-200 hover:scale-105 space-x-1.5"
            @click="handleFavorite"
          >
            <i class="fas fa-heart text-sm"></i>
            <span>В избранное</span>
          </button>

          <button
            class="flex items-center justify-center px-3 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium transition-all duration-200 hover:scale-105 space-x-1.5"
            @click="$router.push('/')"
          >
            <i class="fas fa-list-alt text-sm"></i>
            <span>Темы</span>
          </button>
        </div>

        <!-- Секция ответов -->
        <div class="mt-12">
          <h3 class="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Ответы
            <span class="text-sm font-normal text-gray-400 ml-2">({{ replies.length }})</span>
          </h3>
          
          <!-- Список ответов -->
          <TransitionGroup name="comment">
            <div v-for="reply in sortedReplies" 
                 :key="reply.id" 
                 class="bg-white rounded-lg shadow p-6">
              <ReplyComment :reply="reply" />
            </div>
          </TransitionGroup>

          <!-- Модальное окно ответа -->
          <ReplyForm
            v-if="showReplyModal"
            :show="showReplyModal"
            :comment-id="selectedReplyId"
            @close="closeReplyModal"
            @reply-submitted="handleReplySubmitted"
          />

          <!-- Форма добавления ответа -->
          <div class="mt-8">
            <Reply
              :topicId="topicId"
              @reply-submitted="loadReplies"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { getAuth } from 'firebase/auth';
import ReplyComment from './ReplyComment.vue';
import ReplyForm from '../components/ReplyForm.vue';
import Reply from '../components/Reply.vue';

const store = useStore();
const route = useRoute();
const router = useRouter();
const auth = getAuth();

// Состояние
const showReplyModal = ref(false);
const selectedReplyId = ref(null);
const replies = ref([]);
const errorState = ref(null);
const isLoadingState = ref(false);

// Текущий пользователь
const currentUser = computed(() => store.state.auth.user);

// ID темы из параметров маршрута
const topicId = computed(() => route.params.id);

// Данные автора
const authorUsername = ref('');
const authorAvatar = ref('');

// Состояния из хранилища
const currentTopic = computed(() => store.getters['topics/getCurrentTopic']);

// Форматированная дата
const formattedDate = computed(() => {
  if (!currentTopic.value?.createdAt) return '';
  return formatDate(currentTopic.value.createdAt);
});

// Обрезанный контент
const truncatedContent = computed(() => {
  return currentTopic.value?.content 
    ? currentTopic.value.content.slice(0, 333) + (currentTopic.value.content.length > 333 ? '...' : '') 
    : '';
});

const loadTopic = async () => {
  try {
    console.log('Загрузка темы с ID:', topicId.value);
    store.commit('topics/SET_LOADING', true);
    store.commit('topics/SET_ERROR', null);
    
    const result = await store.dispatch('topics/fetchTopicById', topicId.value);
    console.log('Результат загрузки темы:', result);
    
    if (!result) {
      store.commit('topics/SET_ERROR', 'Тема не найдена');
      console.error('Тема не найдена');
    } else {
      console.log('Тема успешно загружена:', result);
      // Загружаем профиль автора после успешной загрузки топика
      await loadAuthorProfile();
    }
  } catch (err) {
    store.commit('topics/SET_ERROR', 'Ошибка при загрузке темы');
    console.error('Ошибка при загрузке темы:', err);
  } finally {
    store.commit('topics/SET_LOADING', false);
  }
};

// Загрузка профиля автора
const loadAuthorProfile = async () => {
  if (currentTopic.value?.userId) {
    try {
      const userId = store.getters['auth/getUserId'];
      if (!userId) {
        authorUsername.value = 'Гость';
        authorAvatar.value = '/image/empty_avatar.png';
        return;
      }
      
      await store.dispatch('profile/fetchProfile', currentTopic.value.userId);
      const authorProfile = store.getters['profile/getProfile'];
      authorUsername.value = authorProfile?.username || currentTopic.value?.author?.username || 'Гость';
      authorAvatar.value = authorProfile?.avatarUrl || currentTopic.value?.author?.avatarUrl || '/image/empty_avatar.png';
    } catch (err) {
      console.error('Ошибка при загрузке профиля автора:', err);
      authorUsername.value = 'Гость';
      authorAvatar.value = '/image/empty_avatar.png';
    }
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const loadReplies = async () => {
  try {
    replies.value = await store.dispatch('posts/fetchReplies', topicId.value);
    console.log('Загруженные ответы:', replies.value);
    
    await Promise.all(replies.value.map(async (reply) => {
      console.log('Загрузка профиля для ответа:', reply);
      await store.dispatch('profile/fetchProfile', reply.userId);
      const profile = store.getters['profile/getProfile'];
      console.log('Загруженный профиль:', profile);
      reply.avatar = profile?.avatarUrl || '/image/empty_avatar.png';
      reply.username = profile?.username || 'Аноним';
      console.log('Обновленный ответ:', reply);
    }));
  } catch (error) {
    console.error('Ошибка при загрузке ответов:', error);
  }
};

const handleAddFriend = async () => {
  if (isActionLoading.value) return;
  try {
    isActionLoading.value = true;
    await store.dispatch('addFriend', currentTopic.value.userId);
    // TODO: Показать уведомление об успехе
  } catch (err) {
    console.error('Ошибка при добавлении в друзья:', err);
    // TODO: Показать уведомление об ошибке
  } finally {
    isActionLoading.value = false;
  }
};

const handleMessage = async () => {
  if (isActionLoading.value) return;
  try {
    isActionLoading.value = true;
    await store.dispatch('startConversation', currentTopic.value.userId);
    // TODO: Перенаправить на страницу сообщений
  } catch (err) {
    console.error('Ошибка при создании диалога:', err);
    // TODO: Показать уведомление об ошибке
  } finally {
    isActionLoading.value = false;
  }
};

const getLikeCount = (replyId) => {
  return store.getters['media/getCommentLikes'](replyId);
};

const isLiked = (replyId) => {
  if (!currentUser.value?.uid) return false;
  return store.getters['media/hasUserLikedComment'](replyId, currentUser.value.uid);
};

const handleLike = async (replyId) => {
  if (!currentUser.value) {
    alert('Пожалуйста, войдите в систему, чтобы ставить лайки');
    return;
  }

  try {
    await store.dispatch('media/incrementCommentLike', {
      commentId: replyId,
      userId: currentUser.value.uid
    });
  } catch (error) {
    if (error.message === 'Вы уже поставили лайк этому комментарию') {
      alert(error.message);
    } else {
      console.error('Ошибка при добавлении лайка:', error);
    }
  }
};

// Открытие модального окна ответа
const openReplyModal = (replyId) => {
  if (!store.state.auth.user) {
    router.push('/login');
    return;
  }
  selectedReplyId.value = replyId;
  showReplyModal.value = true;
};

// Закрытие модального окна
const closeReplyModal = () => {
  showReplyModal.value = false;
  selectedReplyId.value = null;
};

// Обработка отправки ответа
const handleReplySubmitted = async () => {
  await loadReplies();
  closeReplyModal();
};

// Загрузка лайков при монтировании компонента
onMounted(async () => {
  loadTopic();
  await loadReplies();
  // Загружаем лайки для всех ответов
  if (replies.value) {
    console.log('Загрузка лайков для ответов:', replies.value);
    for (const reply of replies.value) {
      await store.dispatch('media/fetchCommentLikes', reply.id);
    }
  }
});

const sortedReplies = computed(() => {
  return [...replies.value].sort((a, b) => {
    const likesA = getLikeCount(a.id) || 0;
    const likesB = getLikeCount(b.id) || 0;
    return likesB - likesA; // Сортировка по убыванию (больше лайков - выше)
  });
});
</script>

<style scoped>
.comment-enter-active,
.comment-leave-active {
  transition: all 0.5s ease;
}

.comment-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.comment-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

.comment-move {
  transition: transform 0.5s ease;
}

/* Добавляем hover эффект */
.comment-block {
  transition: all 0.3s ease;
}

.comment-block:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.truncate-content {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  text-overflow: ellipsis;
}

/* Анимация для иконок при наведении */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* Стилизация скроллбара */
p::-webkit-scrollbar {
  width: 8px;
}

p::-webkit-scrollbar-track {
  background: rgba(139, 92, 246, 0.1);
  border-radius: 4px;
}

p::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.2);
  border-radius: 4px;
}

p::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 92, 246, 0.3);
}
</style>