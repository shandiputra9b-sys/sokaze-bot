const { reconcileCustomRoleMember } = require("../modules/custom-roles/customRoleSystem");
const { syncLevelRoleForMember } = require("../modules/levels/levelSystem");

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

    await syncLevelRoleForMember(member, client).catch((error) => {
      console.error(`Failed to reconcile level role for member ${member.id}:`, error);
    });
  }
};
