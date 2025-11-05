using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class addUserSearchHistoryTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_search_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: true),
                    session_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    search_query = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    filters_json = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    results_count = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_search_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_search_history_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_search_history_created_at",
                table: "user_search_history",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_user_search_history_session_id",
                table: "user_search_history",
                column: "session_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_search_history_user_id",
                table: "user_search_history",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_search_history_user_id_created_at",
                table: "user_search_history",
                columns: new[] { "user_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_search_history");
        }
    }
}
