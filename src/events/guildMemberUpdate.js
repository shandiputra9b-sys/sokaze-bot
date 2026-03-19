const { reconcileCustomRoleMember } = require("../modules/custom-roles/customRoleSystem");

module.exports = {
  name: "guildMemberUpdate",
  async execute(oldMember, newMember, client) {
    const member = newMember || oldMember;

    if (!member || member.user?.bot) {
      return;
    }

    await reconcileCustomRoleMember(member, client).catch((error) => {
      console.error(`Failed to reconcile custom role access for member ${member.id}:`, error);
    });
  }
};
