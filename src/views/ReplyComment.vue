<template>
  <div class="mt-4 pl-16">
    <form @submit.prevent="submitReply" class="space-y-4">
      <div class="flex items-start space-x-3">
        <!-- Аватар текущего пользователя -->
        <img
          :src="currentUser?.avatarUrl || '/image/empty_avatar.png'"
          :alt="currentUser?.username || 'Гость'"
          class="w-8 h-8 rounded-full object-cover ring-2 ring-purple-500/20"
          @error="handleAvatarError"
        />

        <!-- Поле ввода -->
        <div class="flex-1">
          <textarea
            v-model="replyContent"
            placeholder="Напишите ваш ответ..."
            class="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
            rows="2"
            @input="adjustTextareaHeight"
          ></textarea>

          <!-- Кнопки -->
          <div class="mt-2 flex justify-end space-x-2">
            <button
              type="button"
              @click="$emit('cancel')"
              class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              :disabled="!replyContent.trim()"
              class="px-4 py-2 text-sm bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-400 transition-all duration-200"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { useToast } from 'vue-toastification';

const toast = useToast();
const props = defineProps({
  commentId: { type: [String, Number], required: true },
  postId: { type: String, required: true },
});

const emit = defineEmits(['cancel']);
const store = useStore();
const replyContent = ref('');
const currentUser = computed(() => store.state.auth.user);

const submitReply = async () => {
  if (!currentUser.value) {
    toast.error('Пожалуйста, войдите в систему');
    return;
  }
  if (!replyContent.value.trim()) {
    toast.warning('Введите текст ответа');
    return;
  }

  try {
    const result = await store.dispatch('reply/addReply', {
      postId: props.postId,
      commentId: props.commentId,
      content: replyContent.value,
    });
    if (result.success) {
      replyContent.value = '';
      toast.success('Ответ успешно добавлен');
      emit('cancel'); // Закрываем форму после успешной отправки
    } else {
      toast.error(result.error || 'Не удалось добавить ответ');
    }
  } catch (error) {
    console.error('Ошибка при отправке ответа:', error);
    toast.error('Произошла ошибка');
  }
};

const handleAvatarError = (event) => {
  event.target.src = '/image/empty_avatar.png';
};

const adjustTextareaHeight = (event) => {
  const textarea = event.target;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
};
</script>