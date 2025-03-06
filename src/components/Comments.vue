<template>
  <div class="space-y-6">
    <!-- Список комментариев -->
    <div class="space-y-6">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg"
      >
        <div class="p-6">
          <!-- Шапка комментария -->
          <div class="flex items-start space-x-4">
            <img
              :src="comment.author?.avatarUrl || '/image/empty_avatar.png'"
              :alt="comment.author?.username || 'Гость'"
              class="w-12 h-12 rounded-full object-cover ring-4 ring-purple-500/30"
              @error="handleAvatarError"
            >
            <div class="flex-1">
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

              <div class="mt-4 text-gray-600 dark:text-gray-300">
                {{ comment.content }}
              </div>

              <div class="mt-4 flex items-center space-x-4 text-sm">
                <button
                  @click="toggleLike(comment.id)"
                  class="flex items-center space-x-2 focus:outline-none"
                  :disabled="isLiking[comment.id]"
                  :class="{
                    'text-red-500': isLikedByCurrentUser(comment),
                    'text-gray-500 hover:text-red-500': !isLikedByCurrentUser(comment),
                    'opacity-50 cursor-not-allowed': isLiking[comment.id],
                  }"
                >
                  <i
                    class="fas fa-heart"
                    :class="{ 'fa-spin': isLiking[comment.id] }"
                  ></i>
                  <span>{{ comment.likes || 0 }}</span>
                </button>
                <button
                  @click="toggleReplyForm(comment.id)"
                  class="flex items-center space-x-2 text-gray-500 hover:text-blue-500"
                >
                  <i class="fas fa-reply"></i>
                  <span>Ответить</span>
                </button>
              </div>

              <!-- Форма ответа -->
              <ReplyComment
                v-if="activeReplyCommentId === comment.id"
                :comment-id="comment.id"
                :post-id="postId"
                @cancel="toggleReplyForm(null)"
              />
            </div>
          </div>
        </div>

        <!-- Ответы на комментарий -->
        <div
          v-if="replies(comment.id).length"
          class="border-t border-gray-100 dark:border-gray-700"
        >
          <div
            v-for="reply in replies(comment.id)"
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
                  <span class="text-sm text-gray-500">{{ formatDate(reply.createdAt) }}</span>
                </div>
                <p class="mt-1 text-gray-600 dark:text-gray-300">{{ reply.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Сообщение, если нет комментариев -->
    <div
      v-show="!comments.length"
      class="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm"
    >
      <i class="far fa-comments text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
      <p class="text-gray-500 dark:text-gray-400">Будьте первым, кто оставит комментарий!</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import ReplyComment from '../views/ReplyComment.vue';

const props = defineProps({
  postId: {
    type: String,
    required: true,
  },
});

const store = useStore();
const comments = computed(() => store.getters['comments/getComments'] || []);
const currentUser = computed(() => store.state.auth.user);
const activeReplyCommentId = ref(null);
const isLiking = ref({});

onMounted(() => {
  store.dispatch('comments/fetchComments', props.postId);
  comments.value.forEach((comment) => {
    store.dispatch('reply/fetchReplies', { postId: props.postId, commentId: comment.id });
  });
});

const toggleLike = async (commentId) => {
  if (!currentUser.value || !currentUser.value.uid) {
    alert('Пожалуйста, войдите в систему, чтобы поставить лайк.');
    return;
  }

  isLiking.value[commentId] = true;
  try {
    await store.dispatch('comments/likeComment', {
      postId: props.postId,
      commentId,
    });
  } catch (error) {
    console.error('Ошибка при установке лайка:', error);
    if (error.message === 'Пользователь не авторизован') {
      alert('Ваша сессия истекла. Пожалуйста, войдите снова.');
    }
  } finally {
    isLiking.value[commentId] = false;
  }
};

const isLikedByCurrentUser = (comment) => {
  if (!currentUser.value || !currentUser.value.uid) return false;
  const likedBy = comment.likedBy || {}; // Ожидаем объект
  return !!likedBy[currentUser.value.uid]; // Проверяем наличие ключа
};

const toggleReplyForm = (commentId) => {
  activeReplyCommentId.value = activeReplyCommentId.value === commentId ? null : commentId;
};

const replies = (commentId) => {
  return store.getters['reply/getReplies'](commentId) || [];
};

const handleAvatarError = (event) => {
  event.target.src = '/image/empty_avatar.png';
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
</script>

<style scoped>
.fa-spin {
  animation: fa-spin 1s infinite linear;
}

@keyframes fa-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>