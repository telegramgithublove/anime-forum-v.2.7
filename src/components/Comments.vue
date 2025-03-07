<template>
  <div class="space-y-6">
    <div class="space-y-6">
      <div v-for="comment in comments" :key="comment.id" class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transform hover:shadow-lg transition-all duration-300 animate-fade-in">
        <div class="flex items-start space-x-4">
          <img :src="comment.author?.avatarUrl || '/image/empty_avatar.png'" :alt="comment.author?.username || 'Гость'" class="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/30" @error="handleAvatarError">
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ comment.author?.username || 'Гость' }}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ comment.author?.signature || 'Участник форума' }}</p>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(comment.createdAt) }}</span>
            </div>
            <p class="mt-2 text-gray-700 dark:text-gray-200">{{ comment.content }}</p>
            <div class="mt-3 flex items-center space-x-6">
              <button @click="toggleLike(comment.id)" :disabled="isLiking[comment.id]" class="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-all duration-300" :class="{ 'text-red-500': isLikedByCurrentUser(comment), 'opacity-50': isLiking[comment.id] }">
                <i class="fas fa-heart text-sm" :class="{ 'animate-pulse': isLiking[comment.id] }"></i>
                <span class="text-sm">{{ comment.likes || 0 }}</span>
              </button>
              <button @click="toggleReplyForm(comment.id)" class="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-all duration-300">
                <i class="fas fa-reply text-sm"></i>
                <span class="text-sm">Ответить</span>
              </button>
            </div>
            <ReplyComment v-if="activeReplyCommentId === comment.id" :comment-id="comment.id" :post-id="postId" @cancel="toggleReplyForm(null)" class="mt-4" />
          </div>
        </div>
        <!-- Ответы -->
        <div v-if="replies(comment.id).length" class="mt-4 space-y-4 pl-8 border-l-2 border-purple-500/20">
          <div v-for="reply in replies(comment.id)" :key="reply.id" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm transform hover:scale-102 transition-all duration-300 animate-fade-in">
            <div class="flex items-start space-x-3">
              <img :src="reply.author?.avatarUrl || '/image/empty_avatar.png'" :alt="reply.author?.username || 'Гость'" class="w-8 h-8 rounded-full object-cover" @error="handleAvatarError">
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white">{{ reply.author?.username || 'Гость' }}</h4>
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(reply.createdAt) }}</span>
                </div>
                <p class="mt-1 text-gray-600 dark:text-gray-300 text-sm">{{ reply.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-show="!comments.length" class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <i class="far fa-comments text-5xl text-gray-300 dark:text-gray-600 mb-4 animate-bounce"></i>
      <p class="text-gray-500 dark:text-gray-400">Будьте первым, кто оставит комментарий!</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import ReplyComment from '../views/ReplyComment.vue';

const props = defineProps({
  postId: { type: String, required: true },
  currentPage: { type: Number, default: 1 },
  itemsPerPage: { type: Number, default: 10 },
});

const store = useStore();
const allComments = computed(() => store.getters['comments/getComments'] || []);
const comments = computed(() => {
  const start = (props.currentPage - 1) * props.itemsPerPage;
  const end = start + props.itemsPerPage;
  return allComments.value.slice(start, end);
});
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
    await store.dispatch('comments/likeComment', { postId: props.postId, commentId });
  } catch (error) {
    console.error('Ошибка при установке лайка:', error);
    if (error.message === 'Пользователь не авторизован') alert('Ваша сессия истекла. Пожалуйста, войдите снова.');
  } finally {
    isLiking.value[commentId] = false;
  }
};

const isLikedByCurrentUser = (comment) => currentUser.value && comment.likedBy?.[currentUser.value.uid];
const toggleReplyForm = (commentId) => activeReplyCommentId.value = activeReplyCommentId.value === commentId ? null : commentId;
const replies = (commentId) => store.getters['reply/getReplies'](commentId) || [];
const handleAvatarError = (event) => event.target.src = '/image/empty_avatar.png';
const formatDate = (timestamp) => timestamp ? new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp)) : '';
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-in;
}
.animate-bounce {
  animation: bounce 2s infinite;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}
</style>