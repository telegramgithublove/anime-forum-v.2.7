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
              <!-- Аватар -->
              <div class="flex-shrink-0">
                <img 
                  :src="comment.author?.avatarUrl || '/image/empty_avatar.png'"
                  :alt="comment.author?.username || 'Гость'"
                  class="w-12 h-12 rounded-full object-cover ring-4 ring-purple-500/30"
                  @error="handleAvatarError"
                >
              </div>
  
              <!-- Информация об авторе и контент -->
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
  
                <!-- Текст комментария -->
                <div class="mt-4 text-gray-600 dark:text-gray-300">
                  {{ comment.content }}
                </div>
  
                <!-- Действия с комментарием -->
                <div class="mt-4 flex items-center space-x-4 text-sm">
                  <button 
                    @click="likeComment(comment.id)" 
                    class="flex items-center space-x-2"
                    :class="{
                      'text-red-500': isLikedByCurrentUser(comment),
                      'text-gray-500 hover:text-red-500': !isLikedByCurrentUser(comment)
                    }"
                  >
                    <i class="fas fa-heart"></i>
                    <span>{{ comment.likes || 0 }}</span>
                  </button>
                  <button 
                    @click="replyToComment(comment.id)"
                    class="flex items-center space-x-2 text-gray-500 hover:text-blue-500"
                  >
                    <i class="fas fa-reply"></i>
                    <span>Ответить</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Ответы на комментарий -->
          <div v-show="comment.replies?.length" class="border-t border-gray-100 dark:border-gray-700">
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
  import { computed, onMounted } from 'vue';
  import { useStore } from 'vuex';
  
  const props = defineProps({
    postId: {
      type: String,
      required: true
    }
  });
  
  const store = useStore();
  const comments = computed(() => store.getters['comments/getComments'] || []);
  const currentUser = computed(() => store.state.auth.user);
  
  onMounted(() => {
    store.dispatch('comments/fetchComments', props.postId);
  });
  
  const likeComment = async (commentId) => {
    try {
      await store.dispatch('comments/likeComment', {
        postId: props.postId,
        commentId
      });
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };
  
  const isLikedByCurrentUser = (comment) => {
    if (!currentUser.value) return false;
    const likedBy = comment.likedBy || [];
    return likedBy.includes(currentUser.value.uid);
  };
  
  const replyToComment = (commentId) => {
    // TODO: Implement reply functionality
    console.log('Reply to comment:', commentId);
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
      minute: '2-digit'
    }).format(date);
  };
  </script>