// store/modules/reply.js
import { ref as databaseRef, push, set, get, onValue, update } from 'firebase/database';
import { database } from '../../plugins/firebase';

export default {
  namespaced: true,
  state() {
    return {
      replies: {}, // Объект, где ключ — commentId, значение — массив ответов
      comments: [], // Массив комментариев
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
      state.replies[commentId].push(reply);
    },
    SET_COMMENTS(state, comments) {
      state.comments = comments;
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
        });
      } catch (error) {
        console.error('Ошибка при загрузке ответов:', error);
        commit('SET_ERROR', error.message);
      } finally {
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
            username: userProfile.username || 'Guest',
            avatarUrl: userProfile.avatarUrl || '/image/empty_avatar.png',
            signature: userProfile.signature || 'New User',
          },
          createdAt: new Date().toISOString(),
        };

        const repliesRef = databaseRef(database, `posts/${postId}/comments/${commentId}/replies`);
        const newReplyRef = push(repliesRef);
        await set(newReplyRef, newReply);

        return { success: true };
      } catch (error) {
        console.error('Ошибка при добавлении ответа:', error);
        commit('SET_ERROR', error.message);
        return { success: false, error: error.message };
      }
    },

    async fetchComments({ commit }, postId) {
      commit('SET_LOADING', true);
      try {
        const commentsRef = databaseRef(database, `posts/${postId}/comments`);
        
        onValue(commentsRef, (snapshot) => {
          const comments = [];
          if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
              comments.push({
                id: childSnapshot.key,
                ...childSnapshot.val(),
              });
            });
          }
          commit('SET_COMMENTS', comments);
        });
      } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
        commit('SET_ERROR', error.message);
      } finally {
        commit('SET_LOADING', false);
      }
    },
  },
  getters: {
    getReplies: (state) => (commentId) => {
      return state.replies[commentId] || [];
    },
    getComments: (state) => {
      return state.comments;
    },
    isLoading: (state) => state.isLoading,
    hasError: (state) => state.error !== null,
    getError: (state) => state.error,
  },
};