using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemovePropertyRecommendationsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "property_recommendations");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "property_recommendations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    property_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    reason = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    viewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_recommendations", x => x.id);
                    table.ForeignKey(
                        name: "FK_property_recommendations_properties_property_id",
                        column: x => x.property_id,
                        principalTable: "properties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_property_recommendations_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_property_recommendations_created_at",
                table: "property_recommendations",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_property_recommendations_is_active",
                table: "property_recommendations",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_property_recommendations_property_id",
                table: "property_recommendations",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_recommendations_score",
                table: "property_recommendations",
                column: "score");

            migrationBuilder.CreateIndex(
                name: "IX_property_recommendations_user_id",
                table: "property_recommendations",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_recommendations_user_id_property_id",
                table: "property_recommendations",
                columns: new[] { "user_id", "property_id" });
        }
    }
}
