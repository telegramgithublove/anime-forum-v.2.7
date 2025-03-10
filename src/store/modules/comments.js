import { ref as databaseRef, push, set, get, onValue, update, off } from 'firebase/database';
import { database } from '../../plugins/firebase';

export default {
  namespaced: true,
  state() {
    return {
      comments: [],
      isLoading: false,
      error: null,
      unsubscribe: null,
    };
  },
  mutations: {
    SET_COMMENTS(state, comments) {
      state.comments = comments;
    },
    ADD_COMMENT(state, comment) {
      if (!state.comments.some(c => c.id === comment.id)) {
        state.comments.push(comment);
      }
    },
    UPDATE_COMMENT(state, { commentId, updatedComment }) {
      const index = state.comments.findIndex(c => c.id === commentId);
      if (index !== -1) {
        state.comments[index] = { ...state.comments[index], ...updatedComment };
      } else {
        console.warn(`Comment with ID ${commentId} not found in state for update`);
      }
    },
    SET_LOADING(state, status) {
      state.isLoading = status;
    },
    SET_ERROR(state, error) {
      state.error = error;
    },
    SET_UNSUBSCRIBE(state, unsubscribe) {
      state.unsubscribe = unsubscribe;
    },
  },
  actions: {
    async fetchComments({ commit, state }, postId) {
      if (state.unsubscribe) {
        state.unsubscribe();
      }

      commit('SET_LOADING', true);
      return new Promise((resolve, reject) => {
        try {
          const commentsRef = databaseRef(database, `posts/${postId}/comments`);
          const unsubscribe = onValue(
            commentsRef,
            (snapshot) => {
              const comments = [];
              if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                  comments.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val(),
                  });
                });
              }
              console.log('Fetched comments from Firebase:', comments);
              commit('SET_COMMENTS', comments);
              commit('SET_LOADING', false);
              resolve(); // Разрешаем промис после первой загрузки
            },
            (error) => {
              console.error('Ошибка в подписке на комментарии:', error);
              commit('SET_ERROR', error.message);
              commit('SET_LOADING', false);
              reject(error);
            }
          );
          commit('SET_UNSUBSCRIBE', unsubscribe);
        } catch (error) {
          console.error('Ошибка при загрузке комментариев:', error);
          commit('SET_ERROR', error.message);
          commit('SET_LOADING', false);
          reject(error);
        }
      });
    },

    unsubscribeComments({ state, commit }) {
      if (state.unsubscribe) {
        state.unsubscribe();
        commit('SET_UNSUBSCRIBE', null);
        console.log('Unsubscribed from comments listener');
      }
    },

    async addComment({ commit, rootState }, { postId, content, image }) {
      try {
        const currentUser = rootState.auth.user;
        if (!currentUser) {
          throw new Error('Пожалуйста, войдите в систему');
        }

        const userProfileRef = databaseRef(database, `users/${currentUser.uid}/profile`);
        const userProfileSnapshot = await get(userProfileRef);
        const userProfile = userProfileSnapshot.val() || {};

        const newComment = {
          content,
          image, // Добавлено поле image
          author: {
            uid: currentUser.uid,
            username: userProfile.username || 'Гость',
            avatarUrl: userProfile.avatarUrl || '/image/empty_avatar.png',
            signature: userProfile.signature || 'Участник форума',
          },
          createdAt: new Date().toISOString(),
          likes: 0,
          likedBy: {},
        };

        const commentsRef = databaseRef(database, `posts/${postId}/comments`);
        const newCommentRef = push(commentsRef);
        await set(newCommentRef, newComment);

        const commentWithId = { id: newCommentRef.key, ...newComment };
        commit('ADD_COMMENT', commentWithId);
        console.log('Added comment:', commentWithId);
        return { success: true };
      } catch (error) {
        console.error('Ошибка при добавлении комментария:', error);
        commit('SET_ERROR', error.message);
        throw error;
      }
    },

    async likeComment({ commit, rootState }, { postId, commentId }) {
      const user = rootState.auth.user;
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      try {
        const commentRef = databaseRef(database, `posts/${postId}/comments/${commentId}`);
        const snapshot = await get(commentRef);
        const comment = snapshot.val();

        if (!comment) {
          throw new Error('Комментарий не найден');
        }

        const likedBy = comment.likedBy || {};
        const likes = comment.likes || 0;

        if (likedBy[user.uid]) {
          delete likedBy[user.uid];
          await update(commentRef, {
            likes: likes - 1,
            [`likedBy/${user.uid}`]: null,
          });
        } else {
          likedBy[user.uid] = true;
          await update(commentRef, {
            likes: likes + 1,
            [`likedBy/${user.uid}`]: true,
          });
        }

        const updatedComment = { ...comment, likedBy, likes: likedBy[user.uid] ? likes + 1 : likes - 1 };
        commit('UPDATE_COMMENT', { commentId, updatedComment });
        console.log('Updated comment locally:', updatedComment);
      } catch (error) {
        console.error('Ошибка при обновлении лайка:', error);
        throw error;
      }
    },
  },
  getters: {
    getComments: (state) => state.comments,
    isLoading: (state) => state.isLoading,
    hasError: (state) => state.error !== null,
    getError: (state) => state.error,
  },
};