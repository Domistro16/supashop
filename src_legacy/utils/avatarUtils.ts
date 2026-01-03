/**
 * Get role-based avatar image path
 * @param role - User role (owner, manager, cashier, clerk)
 * @returns Path to the avatar image
 */
export function getRoleAvatar(role: string): string {
  const roleAvatars: Record<string, string> = {
    owner: '/images/user/owner.jpg',
    manager: '/images/user/manager.jpg',
    cashier: '/images/user/cashier.jpg',
    clerk: '/images/user/clerk.jpg',
  };

  return roleAvatars[role.toLowerCase()] || '/images/user/user-01.jpg';
}

/**
 * Get initials from a name
 * @param name - Full name
 * @returns Initials (e.g., "John Doe" -> "JD")
 */
export function getInitials(name: string): string {
  if (!name) return '??';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
