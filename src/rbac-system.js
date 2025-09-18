// Sistema RBAC (Role-Based Access Control) para Alert@Postas

export class RBACSystem {
  constructor() {
    this.roles = {
      super_admin: {
        name: 'Super Admin',
        permissions: [
          'users.create', 'users.read', 'users.update', 'users.delete',
          'roles.create', 'roles.read', 'roles.update', 'roles.delete',
          'subscriptions.manage', 'payments.manage',
          'signals.manage', 'filters.configure', 'bot.control',
          'reports.full', 'exports.full', 'system.admin'
        ]
      },
      admin: {
        name: 'Admin Secundário',
        permissions: [
          'users.read', 'users.update', 'users.activate', 'users.deactivate',
          'roles.read',
          'signals.manage', 'filters.configure', 'bot.control',
          'reports.full', 'exports.full'
        ]
      },
      user_premium: {
        name: 'User Premium',
        permissions: [
          'signals.read', 'signals.own_history',
          'reports.own', 'notifications.configure'
        ]
      },
      user_trial: {
        name: 'User Trial',
        permissions: [
          'signals.read_limited', 'signals.own_history',
          'reports.own_basic'
        ]
      },
      user_expired: {
        name: 'User Expirado',
        permissions: [
          'auth.login', 'profile.update'
        ]
      }
    };
  }

  hasPermission(userRole, permission) {
    const role = this.roles[userRole];
    if (!role) return false;
    return role.permissions.includes(permission);
  }

  canManageUsers(userRole) {
    return this.hasPermission(userRole, 'users.create') || 
           this.hasPermission(userRole, 'users.update');
  }

  canConfigureSystem(userRole) {
    return this.hasPermission(userRole, 'system.admin');
  }

  canControlBot(userRole) {
    return this.hasPermission(userRole, 'bot.control');
  }

  canAccessSignals(userRole) {
    return this.hasPermission(userRole, 'signals.read') || 
           this.hasPermission(userRole, 'signals.read_limited');
  }

  canViewReports(userRole) {
    return this.hasPermission(userRole, 'reports.full') || 
           this.hasPermission(userRole, 'reports.own') ||
           this.hasPermission(userRole, 'reports.own_basic');
  }

  getRoleDisplayName(role) {
    return this.roles[role]?.name || role;
  }

  getAllRoles() {
    return Object.keys(this.roles).map(key => ({
      key,
      name: this.roles[key].name,
      permissions: this.roles[key].permissions
    }));
  }
}

export class UserManager {
  constructor() {
    this.users = [
      {
        id: 'super-admin-1',
        email: 'admin@alertapostas.pt',
        password: 'admin123',
        role: 'super_admin',
        subscription: 'active',
        subscriptionExpiry: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }
    ];
    this.rbac = new RBACSystem();
  }

  createUser(userData) {
    const user = {
      id: Date.now().toString(),
      email: userData.email,
      password: userData.password,
      role: userData.role || 'user_premium',
      subscription: userData.subscription || 'trial',
      subscriptionExpiry: userData.subscriptionExpiry || this.getTrialExpiry(),
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    this.users.push(user);
    return user;
  }

  getUserById(id) {
    return this.users.find(u => u.id === id);
  }

  getUserByEmail(email) {
    return this.users.find(u => u.email === email);
  }

  updateUser(id, updates) {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], ...updates };
      return this.users[userIndex];
    }
    return null;
  }

  deleteUser(id) {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      return this.users.splice(userIndex, 1)[0];
    }
    return null;
  }

  getAllUsers() {
    return this.users.map(user => ({
      ...user,
      password: undefined // Remove password from response
    }));
  }

  getUsersByRole(role) {
    return this.users.filter(u => u.role === role);
  }

  getActiveUsers() {
    return this.users.filter(u => u.isActive);
  }

  getExpiredUsers() {
    const now = new Date();
    return this.users.filter(u => 
      u.subscriptionExpiry && new Date(u.subscriptionExpiry) < now
    );
  }

  activateUser(id) {
    return this.updateUser(id, { isActive: true });
  }

  deactivateUser(id) {
    return this.updateUser(id, { isActive: false });
  }

  updateSubscription(id, subscription, expiry) {
    return this.updateUser(id, { 
      subscription, 
      subscriptionExpiry: expiry 
    });
  }

  updateRole(id, role) {
    return this.updateUser(id, { role });
  }

  resetPassword(id, newPassword) {
    return this.updateUser(id, { password: newPassword });
  }

  getTrialExpiry() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 dias de trial
    return expiry.toISOString();
  }

  isSubscriptionValid(user) {
    if (!user.subscriptionExpiry) return true;
    return new Date(user.subscriptionExpiry) > new Date();
  }

  getUserStats() {
    const total = this.users.length;
    const active = this.getActiveUsers().length;
    const expired = this.getExpiredUsers().length;
    
    const roleStats = {};
    this.users.forEach(user => {
      roleStats[user.role] = (roleStats[user.role] || 0) + 1;
    });

    return {
      total,
      active,
      expired,
      inactive: total - active,
      roleStats
    };
  }
}

export class SubscriptionManager {
  constructor() {
    this.plans = {
      trial: {
        name: 'Trial',
        duration: 7, // dias
        maxSignals: 10,
        price: 0
      },
      premium: {
        name: 'Premium',
        duration: 30, // dias
        maxSignals: 100,
        price: 29.99
      },
      pro: {
        name: 'Pro',
        duration: 30,
        maxSignals: 500,
        price: 59.99
      },
      vip: {
        name: 'VIP',
        duration: 30,
        maxSignals: -1, // ilimitado
        price: 99.99
      }
    };
  }

  getPlan(planName) {
    return this.plans[planName];
  }

  calculateExpiry(planName, startDate = new Date()) {
    const plan = this.getPlan(planName);
    if (!plan) return null;
    
    const expiry = new Date(startDate);
    expiry.setDate(expiry.getDate() + plan.duration);
    return expiry.toISOString();
  }

  canSendSignal(user, signalsToday) {
    const plan = this.getPlan(user.subscription);
    if (!plan) return false;
    
    if (plan.maxSignals === -1) return true; // ilimitado
    return signalsToday < plan.maxSignals;
  }

  getUpgradeOptions(currentPlan) {
    const currentPlanData = this.getPlan(currentPlan);
    if (!currentPlanData) return [];
    
    return Object.entries(this.plans)
      .filter(([name, plan]) => plan.price > currentPlanData.price)
      .map(([name, plan]) => ({ name, ...plan }));
  }
}
