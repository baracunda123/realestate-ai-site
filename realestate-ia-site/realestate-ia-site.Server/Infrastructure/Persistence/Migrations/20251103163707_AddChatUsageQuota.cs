using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChatUsageQuota : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_usage_quotas",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    used_prompts = table.Column<int>(type: "integer", nullable: false),
                    max_prompts = table.Column<int>(type: "integer", nullable: false),
                    plan_type = table.Column<string>(type: "text", nullable: false),
                    period_start = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    period_end = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_used_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_usage_quotas", x => x.id);
                    table.ForeignKey(
                        name: "FK_chat_usage_quotas_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_chat_usage_quotas_period_end",
                table: "chat_usage_quotas",
                column: "period_end");

            migrationBuilder.CreateIndex(
                name: "IX_chat_usage_quotas_plan_type",
                table: "chat_usage_quotas",
                column: "plan_type");

            migrationBuilder.CreateIndex(
                name: "IX_chat_usage_quotas_user_id",
                table: "chat_usage_quotas",
                column: "user_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_usage_quotas");
        }
    }
}
