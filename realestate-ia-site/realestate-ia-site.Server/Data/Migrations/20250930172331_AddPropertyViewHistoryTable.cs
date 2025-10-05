using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyViewHistoryTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "property_view_history",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    property_id = table.Column<string>(type: "text", nullable: false),
                    viewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    view_count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_view_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_property_view_history_properties_property_id",
                        column: x => x.property_id,
                        principalTable: "properties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_property_view_history_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_property_view_history_property_id",
                table: "property_view_history",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_view_history_user_id",
                table: "property_view_history",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_view_history_user_id_property_id",
                table: "property_view_history",
                columns: new[] { "user_id", "property_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_property_view_history_user_id_viewed_at",
                table: "property_view_history",
                columns: new[] { "user_id", "viewed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_property_view_history_viewed_at",
                table: "property_view_history",
                column: "viewed_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "property_view_history");
        }
    }
}
