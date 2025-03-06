<template>
  <div class="reply-to-comment">
    <div class="bg-white rounded-lg shadow-sm p-6 mb-4 hover:shadow-md transition-shadow duration-200">
      <!-- Верхняя часть с информацией о пользователе и лайками -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-4">
          <router-link :to="`/profile/${reply.userId}`" class="flex-shrink-0">
            <img
              :src="reply.userAvatar || '/default-avatar.png'"
              :alt="reply.username"
              class="w-10 h-10 rounded-full object-cover border-2 border-purple-200 hover:border-purple-400 transition-colors duration-200"
            />
          </router-link>
          <div>
            <router-link 
              :to="`/profile/${reply.userId}`"
              class="font-medium text-gray-900 hover:text-purple-600 transition-colors duration-200"
            >
              {{ reply.username }}
            </router-link>
            <div class="text-sm text-gray-500">{{ formatDate(reply.createdAt) }}</div>
          </div>
        </div>
        
        <!-- Лайки справа -->
        <button 
          @click="handleLike"
          class="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-all duration-200"
          :class="{ 'text-purple-600 bg-purple-50': isLiked }"
          :disabled="isLiked"
        >
          <i class="fas fa-heart"></i>
          <span class="text-sm font-medium">{{ likeCount }}</span>
        </button>
      </div>

      <!-- Контент ответа -->
      <div class="pl-14">
        <p class="text-gray-700 whitespace-pre-wrap">{{ reply.content }}</p>
        
        <!-- Прикрепленные медиа файлы -->
        <div v-if="reply.image || reply.video" class="mt-3">
          <img 
            v-if="reply.image" 
            :src="reply.image" 
            alt="Прикрепленное изображение"
            class="max-w-sm rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            @click="openMediaPreview(reply.image)"
          />
          <video 
            v-if="reply.video" 
            :src="reply.video" 
            class="max-w-sm rounded-lg shadow-sm mt-2"
            controls
          ></video>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

const props = defineProps({
  reply: {
    type: Object,
    required: true
  }
});

const store = useStore();
const router = useRouter();

const likeCount = computed(() => {
  return store.getters['media/getCommentLikes'](props.reply.id);
});

const isLiked = computed(() => {
  const currentUser = store.state.auth.user;
  if (!currentUser) return false;
  return store.getters['media/hasUserLikedComment'](props.reply.id, currentUser.uid);
});

function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function handleLike() {
  const currentUser = store.state.auth.user;
  if (!currentUser) {
    router.push('/login');
    return;
  }

  try {
    await store.dispatch('media/incrementCommentLike', {
      commentId: props.reply.id,
      userId: currentUser.uid
    });
  } catch (error) {
    if (error.message === 'Вы уже поставили лайк этому комментарию') {
      alert(error.message);
    } else {
      console.error('Ошибка при обработке лайка:', error);
    }
  }
}

function openMediaPreview(imageUrl) {
  // Здесь можно добавить логику для открытия изображения в модальном окне
  window.open(imageUrl, '_blank');
}
</script>

<style scoped>
.reply-to-comment {
  position: relative;
}

.reply-to-comment::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 0;
  height: 100%;
  width: 2px;
  background-color: #e5e7eb;
}
</style>
