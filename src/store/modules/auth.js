import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  applyActionCode,
  onAuthStateChanged
} from 'firebase/auth';
import { ref as databaseRef, get, set, update, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../plugins/firebase';
import axios from 'axios';

const auth = getAuth();

const state = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  token: null,
  authUnsubscribe: null,
  userProfile: {
    username: '',
    avatarUrl: '',
    signature: ''
  }
};

const getters = {
  isAuthenticated: (state) => state.isAuthenticated,
  currentUser: (state) => state.user,
  getUserId: (state) => state.user?.uid,
  authError: (state) => state.error,
  isLoading: (state) => state.loading,
  getUser: (state) => state.user,
  getUserId: (state) => {
    return state.user ? state.user.uid : localStorage.getItem('userId');
  },
  getUsername: (state) => {
    if (state.user && state.user.profile && state.user.profile.username) {
      return state.user.profile.username;
    }
    if (state.user && state.user.username) {
      return state.user.username;
    }
    const storedUsername = localStorage.getItem('username');
    return storedUsername || 'Гость';
  },
  getUserAvatar: (state) => {
    if (state.user && state.user.profile && state.user.profile.avatarUrl) {
      return state.user.profile.avatarUrl;
    }
    if (state.user && state.user.avatarUrl) {
      return state.user.avatarUrl;
    }
    return localStorage.getItem('userAvatarUrl') || '/image/empty_avatar.png';
  },
  getUserSignature: (state) => {
    if (state.user && state.user.profile && state.user.profile.signature) {
      return state.user.profile.signature;
    }
    return state.user?.signature || localStorage.getItem('userSignature') || '';
  },
  isSuperUser: (state) => {
    return state.user && state.user.role === 'superuser';
  },
  userRole: (state) => {
    if (state.user && state.user.role) {
      return state.user.role;
    }
    return null;
  },
  isEmailVerified: (state) => {
    return state.user ? state.user.emailVerified : localStorage.getItem('emailVerified') === 'true';
  },
  getUserSettings: (state) => {
    if (state.user?.settings) {
      return state.user.settings;
    }
    const settings = localStorage.getItem('userSettings');
    return settings ? JSON.parse(settings) : null;
  }
};

const actions = {
  async registration({ commit, dispatch }, userData) {
    try {
      console.log('Starting registration with data:', { ...userData, password: '[REDACTED]' });
      
      if (!userData.username || !userData.email || !userData.password || !userData.passwordConfirmation) {
        throw new Error('Пожалуйста, заполните все поля.')
      }
      
      if (userData.password !== userData.passwordConfirmation) {
        throw new Error('Пароли не совпадают')
      }

      // Проверяем, существует ли пользователь с таким username
      const usernameExists = await dispatch('checkUsernameExists', userData.username);
      if (usernameExists) {
        throw new Error('Пользователь с таким именем уже существует');
      }

      // Устанавливаем username в state сразу, чтобы UI обновился быстрее
      commit('UPDATE_USERNAME', userData.username);

      console.log('Creating user with Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(getAuth(), userData.email, userData.password)
      const user = userCredential.user
      console.log('User created in Firebase Auth:', user.uid);

      // Отправляем письмо верификации сразу после создания пользователя
      try {
        await sendEmailVerification(user, {
          url: window.location.origin + '/verify-email'
        });
        console.log('Verification email sent successfully');
      } catch (verificationError) {
        console.error('Error sending verification email:', verificationError);
      }

      const userRef = databaseRef(database, `users/${user.uid}`);
      console.log('Creating user reference in database...');
      
      const role = 'user';
      
      const userProfile = {
        username: userData.username,
        avatarUrl: '/image/empty_avatar.png',
        signature: 'Новый пользователь'
      };

      // Обновляем профиль пользователя в state немедленно
      commit('UPDATE_USER_PROFILE', userProfile);

      const userDataForDB = {
        username: userData.username,
        email: userData.email,
        role: role,
        profile: userProfile,
        settings: {
          profileVisibility: true,
          notifyMessages: true,
          notifyReplies: true,
          theme: 'light'
        },
        emailVerified: false,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        status: 'active'
      }
      
      console.log('Setting user data in database...');
      await set(userRef, userDataForDB)
      console.log('User data saved in database');
      
      const userDataToStore = { 
        uid: user.uid, 
        email: userData.email,
        role: role,
        emailVerified: false,
        profile: {
          username: userData.username,
          avatarUrl: '/image/empty_avatar.png',
          signature: 'Новый пользователь'
        },
        settings: userDataForDB.settings
      };
      
      commit('SET_USER', userDataToStore);
      commit('SET_AUTHENTICATED', true);
      commit('SET_TOKEN', user.accessToken);
  
      // Сохраняем данные пользователя в localStorage
      localStorage.setItem('user', JSON.stringify(userDataToStore));
      localStorage.setItem('userToken', user.accessToken);
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('username', userProfile.username);
      localStorage.setItem('userRole', role);
      localStorage.setItem('emailVerified', 'false');
      localStorage.setItem('userAvatarUrl', userProfile.avatarUrl);
      localStorage.setItem('userSignature', userProfile.signature);
      localStorage.setItem('userSettings', JSON.stringify(userDataForDB.settings));
      
      console.log('Registration completed successfully');
      return {
        success: true,
        user: userDataToStore
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Произошла ошибка при регистрации';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Этот email уже используется';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Некорректный email адрес';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Регистрация с email и паролем отключена';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Пароль слишком слабый';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  async login({ commit, dispatch }, { email, password }) {
    try {
      // Специальный вход для superuser
      if (email.toLowerCase() === 'superuser') {
        if (password === 'C7ceb1fd&') { // Специальный пароль администратора
          const superUserData = {
            uid: 'superuser-id',
            email: 'admin@example.com',
            username: 'SuperUser',
            role: 'superuser',
            emailVerified: true,
            avatarUrl: '/image/empty_avatar.png',
            signature: 'Administrator',
            settings: {
              profileVisibility: true,
              notifyMessages: true,
              notifyReplies: true,
              theme: 'light'
            }
          };

          commit('SET_USER', superUserData);
          commit('SET_AUTHENTICATED', true);
          commit('SET_TOKEN', 'superuser-token');

          localStorage.setItem('user', JSON.stringify(superUserData));
          localStorage.setItem('userToken', 'superuser-token');
          localStorage.setItem('userId', superUserData.uid);
          localStorage.setItem('username', superUserData.username);
          localStorage.setItem('userRole', 'superuser');
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('emailVerified', 'true');
          localStorage.setItem('userAvatarUrl', superUserData.avatarUrl);
          localStorage.setItem('userSettings', JSON.stringify(superUserData.settings));

          return {
            error: false,
            user: superUserData,
            redirectTo: '/admin'
          };
        } else {
          return {
            error: true,
            message: 'Неверный пароль администратора',
            code: 'auth/wrong-password'
          };
        }
      }

      // Обычный вход для остальных пользователей
      const usersRef = databaseRef(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      let userFound = false;
      let userData = null;
      
      usersSnapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        if (user.email === email) {
          userFound = true;
          userData = { ...user, uid: childSnapshot.key };
        }
      });

      if (!userFound) {
        return {
          error: true,
          message: 'Данные пользователя не найдены',
          code: 'user-not-found'
        };
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRole = userData.role || 'user';

      const userDataToStore = {
        uid: user.uid,
        email: user.email,
        username: userData.username || userData.profile?.username,
        role: userRole,
        emailVerified: user.emailVerified,
        avatarUrl: userData.profile?.avatarUrl || '/image/empty_avatar.png',
        signature: userData.profile?.signature || '',
        settings: userData.settings || {}
      };

      commit('SET_USER', userDataToStore);
      commit('SET_AUTHENTICATED', true);
      commit('SET_TOKEN', user.accessToken);

      localStorage.setItem('user', JSON.stringify(userDataToStore));
      localStorage.setItem('userToken', user.accessToken);
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('username', userDataToStore.username);
      localStorage.setItem('userRole', userRole);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('emailVerified', user.emailVerified);
      localStorage.setItem('userAvatarUrl', userDataToStore.avatarUrl);
      localStorage.setItem('userSettings', JSON.stringify(userDataToStore.settings));

      return {
        error: false,
        user: userDataToStore,
        redirectTo: userRole === 'superuser' ? '/admin' : '/'
      };
    } catch (error) {
      try {
        await signOut(auth);
      } catch (e) {
      }
      
      return {
        error: true,
        message: error.message,
        code: error.code
      };
    }
  },

  async logout({ commit, state }) {
    try {
      // Сначала выходим из Firebase Auth
      await signOut(auth);
      
      // Очищаем состояние Vuex
      commit('SET_USER', null);
      commit('SET_AUTHENTICATED', false);
      commit('SET_TOKEN', null);
      
      // Полностью очищаем localStorage одной командой
      localStorage.clear();
      
      // Отписываемся от слушателя авторизации
      if (state.authUnsubscribe) {
        state.authUnsubscribe();
        commit('SET_AUTH_UNSUBSCRIBE', null);
      }

      console.log('Выход выполнен успешно, все данные очищены');
      return true;
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      throw error;
    }
  },

  async updateUserAvatar({ commit, state }, avatarUrl) {
    try {
      if (!state.user || !state.user.uid) return;
      
      const userRef = databaseRef(database, `users/${state.user.uid}/profile`);
      await update(userRef, {
        avatarUrl: avatarUrl
      });

      commit('UPDATE_USER_AVATAR', avatarUrl);
      
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      userData.profile = { ...userData.profile, avatarUrl };
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('avatarUrl', avatarUrl);

      return avatarUrl;
    } catch (error) {
      throw error;
    }
  },

  async updateUserUsername({ commit }, username) {
    commit('UPDATE_USER_USERNAME', username);
  },

  async updateUsername({ commit, state }, username) {
    try {
      if (!username.trim()) {
        throw new Error('Имя пользователя не может быть пустым');
      }

      const userId = state.user?.uid;
      if (!userId) throw new Error('Пользователь не авторизован');

      const userRef = databaseRef(database, `users/${userId}/profile`);
      await set(userRef, {
        ...state.userProfile,
        username: username
      });

      commit('UPDATE_USERNAME', username);
      
      commit('profile/UPDATE_USERNAME', username, { root: true });
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  },

  async fetchUserProfile({ commit, state, dispatch }) {
    if (!state.user?.uid) return;
    
    try {
      await dispatch('profile/loadProfile', state.user.uid, { root: true });
    } catch (error) {
      commit('SET_ERROR', error.message);
    }
  },

  async checkEmailVerification({ commit, state }) {
    try {
      const user = auth.currentUser;
      
      if (user) {
        await user.reload();
        
        commit('setEmailVerified', user.emailVerified);
        
        if (user.emailVerified) {
          const userRef = databaseRef(database, `users/${user.uid}`);
          await update(userRef, {
            emailVerified: true,
            lastVerifiedAt: new Date().toISOString()
          });
        }
        
        return user.emailVerified;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  async handleEmailVerification({ dispatch }, { oobCode }) {
    try {
      await applyActionCode(auth, oobCode);
      
      await dispatch('checkEmailVerification');
      
      return true;
    } catch (error) {
      return false;
    }
  },

  async sendVerificationEmail({ commit }) {
    try {
      const user = auth.currentUser;
      
      if (user) {
        const actionCodeSettings = {
          url: 'http://localhost:5174/verify-email',
          handleCodeInApp: true
        };
        
        await sendEmailVerification(user, actionCodeSettings);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  async checkUsernameExists({ state }, username) {
    try {
      const usersRef = databaseRef(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const userId in users) {
          const user = users[userId];
          if (user.profile && 
              user.profile.username === username && 
              userId !== state.user?.uid) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      throw error;
    }
  },

  async initAuth({ commit }) {
    const userRole = localStorage.getItem('userRole');
    
    if (userRole === 'superuser') {
      const superUserData = {
        uid: localStorage.getItem('userId'),
        email: localStorage.getItem('userEmail'),
        role: userRole,
        emailVerified: localStorage.getItem('emailVerified') === 'true',
        profile: JSON.parse(localStorage.getItem('userProfile') || '{}'),
        settings: JSON.parse(localStorage.getItem('userSettings') || '{}')
      };
      
      commit('SET_USER', superUserData);
      commit('SET_AUTHENTICATED', true);
      commit('UPDATE_USER_PROFILE', superUserData.profile);
      return;
    }

    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          const token = await user.getIdToken(true);
          
          commit('SET_USER', user);
          commit('SET_AUTHENTICATED', true);
          commit('SET_TOKEN', token);
          
          try {
            const userRef = databaseRef(database, `users/${user.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
              commit('UPDATE_USER_PROFILE', snapshot.val());
            }
          } catch (error) {
            commit('SET_ERROR', error.message);
          }
        } else {
          commit('SET_USER', null);
          commit('SET_AUTHENTICATED', false);
          commit('SET_TOKEN', null);
        }
        resolve(user);
      });

      commit('SET_AUTH_UNSUBSCRIBE', unsubscribe);
    });
  },

  async setUser({ commit }, userData) {
    try {
      commit('SET_USER', userData)
      
      if (userData) {
        localStorage.setItem('userId', userData.uid)
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('emailVerified', userData.emailVerified)
        
        if (userData.email) {
          localStorage.setItem('userEmail', userData.email)
        }
      } else {
        localStorage.removeItem('userId')
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('emailVerified')
        localStorage.removeItem('userEmail')
      }
    } catch (error) {
      throw error
    }
  },
};

const mutations = {
  SET_USER(state, user) {
    state.user = user;
    if (!user) {
      // Если пользователь null, очищаем весь localStorage
      localStorage.clear();
    } else {
      // Сохраняем полные данные пользователя
      localStorage.setItem('user', JSON.stringify(user));
      if (user.profile) {
        localStorage.setItem('username', user.profile.username);
        localStorage.setItem('userAvatarUrl', user.profile.avatarUrl);
        localStorage.setItem('userSignature', user.profile.signature || '');
      }
    }
  },
  
  SET_AUTHENTICATED(state, value) {
    state.isAuthenticated = value;
  },
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  SET_ERROR(state, error) {
    state.error = error;
  },
  UPDATE_USER_PROFILE(state, profile) {
    if (!state.user) {
      state.user = {};
    }
    if (!state.user.profile) {
      state.user.profile = {};
    }
    state.user.profile = { ...state.user.profile, ...profile };
    
    // Обновляем данные в localStorage
    if (profile.username) localStorage.setItem('username', profile.username);
    if (profile.avatarUrl) localStorage.setItem('userAvatarUrl', profile.avatarUrl);
    if (profile.signature) localStorage.setItem('userSignature', profile.signature);
  },
  UPDATE_USERNAME(state, username) {
    if (!state.user) {
      state.user = {};
    }
    if (!state.user.profile) {
      state.user.profile = {};
    }
    state.user.profile.username = username;
  },
  SET_TOKEN(state, token) {
    state.token = token;
  },
  UPDATE_USER_AVATAR(state, avatarUrl) {
    if (state.user) {
      if (!state.user.profile) {
        state.user.profile = {};
      }
      state.user.profile.avatarUrl = avatarUrl;
    }
  },
  UPDATE_USER_USERNAME(state, username) {
    if (state.user) {
      state.user.username = username;
      localStorage.setItem('user', JSON.stringify(state.user));
    }
  },
  setEmailVerified(state, emailVerified) {
    if (state.user) {
      state.user.emailVerified = emailVerified;
      localStorage.setItem('user', JSON.stringify(state.user));
    }
  },
  SET_AUTH_UNSUBSCRIBE(state, unsubscribe) {
    if (state.authUnsubscribe) {
      state.authUnsubscribe();
    }
    state.authUnsubscribe = unsubscribe;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
