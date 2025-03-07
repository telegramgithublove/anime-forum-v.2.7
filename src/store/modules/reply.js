import { ref as databaseRef, push, set, get, onValue } from 'firebase/database';
import { database } from '../../plugins/firebase';

export default {
  namespaced: true,
  state() {
    return {
      replies: {}, // Ответы хранятся в объекте, где ключ — commentId
      isLoading: false,
      error: null,
    };
  },
  mutations: {
    SET_REPLIES(state, { commentId, replies }) {
      state.replies[commentId] = replies;
    },
    ADD_REPLY(state, { commentId, reply }) {
      if (!state.replies[commentId]) {
        state.replies[commentId] = [];
      }
      // Проверяем, чтобы избежать дублирования
      if (!state.replies[commentId].some(r => r.id === reply.id)) {
        state.replies[commentId].push(reply);
      }
    },
    SET_LOADING(state, status) {
      state.isLoading = status;
    },
    SET_ERROR(state, error) {
      state.error = error;
    },
  },
  actions: {
    async fetchReplies({ commit }, { postId, commentId }) {
      commit('SET_LOADING', true);
      try {
        const repliesRef = databaseRef(database, `posts/${postId}/comments/${commentId}/replies`);
        onValue(repliesRef, (snapshot) => {
          const replies = [];
          if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
              replies.push({
                id: childSnapshot.key,
                ...childSnapshot.val(),
              });
            });
          }
          commit('SET_REPLIES', { commentId, replies });
          commit('SET_LOADING', false);
        }, {
          onlyOnce: false, // Подписка на изменения в реальном времени
        });
      } catch (error) {
        console.error('Ошибка при загрузке ответов:', error);
        commit('SET_ERROR', error.message);
        commit('SET_LOADING', false);
      }
    },

    async addReply({ commit, rootState }, { postId, commentId, content }) {
      try {
        const currentUser = rootState.auth.user;
        if (!currentUser) {
          throw new Error('Пожалуйста, войдите в систему');
        }

        const userProfileRef = databaseRef(database, `users/${currentUser.uid}/profile`);
        const userProfileSnapshot = await get(userProfileRef);
        const userProfile = userProfileSnapshot.val() || {};

        const newReply = {
          content,
          author: {
            uid: currentUser.uid,
            username: userProfile.username || 'Гость',
            avatarUrl: userProfile.avatarUrl || '/image/empty_avatar.png',
            signature: userProfile.signature || 'Участник форума',
          },
          createdAt: new Date().toISOString(),
        };

        const repliesRef = databaseRef(database, `posts/${postId}/comments/${commentId}/replies`);
        const newReplyRef = push(repliesRef);
        await set(newReplyRef, newReply);

        // Локально добавляем только если ещё не добавлено (опционально можно убрать)
        commit('ADD_REPLY', { commentId, reply: { id: newReplyRef.key, ...newReply } });
        return { success: true };
      } catch (error) {
        console.error('Ошибка при добавлении ответа:', error);
        commit('SET_ERROR', error.message);
        return { success: false, error: error.message };
      }
    },
  },
  getters: {
    getReplies: (state) => (commentId) => {
      return state.replies[commentId] || [];
    },
    isLoading: (state) => state.isLoading,
    hasError: (state) => state.error !== null,
    getError: (state) => state.error,
  },
};