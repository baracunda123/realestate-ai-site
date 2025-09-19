using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class addPropertyRecommendationAndPropertyAlertNoficiationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "property_alert_notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    property_id = table.Column<string>(type: "text", nullable: false),
                    alert_id = table.Column<Guid>(type: "uuid", nullable: false),
                    alert_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    property_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    old_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    property_location = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_alert_notifications", x => x.id);
                    table.ForeignKey(
                        name: "FK_property_alert_notifications_properties_property_id",
                        column: x => x.property_id,
                        principalTable: "properties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_property_alert_notifications_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "property_recommendations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    property_id = table.Column<string>(type: "text", nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    viewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
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
                name: "IX_property_alert_notifications_alert_id",
                table: "property_alert_notifications",
                column: "alert_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_alert_notifications_alert_type",
                table: "property_alert_notifications",
                column: "alert_type");

            migrationBuilder.CreateIndex(
                name: "IX_property_alert_notifications_created_at",
                table: "property_alert_notifications",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_property_alert_notifications_is_active",
                table: "property_alert_notifications",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_property_alert_notifications_property_id",
                table: "property_alert_notifications",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_alert_notifications_read_at",
                table: "property_alert_notifications",
                column: "read_at");

            migrationBuilder.CreateIndex(
                name: "IX_property_alert_notifications_user_id",
                table: "property_alert_notifications",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_alert_notifications_user_id_property_id",
                table: "property_alert_notifications",
                columns: new[] { "user_id", "property_id" });

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "property_alert_notifications");

            migrationBuilder.DropTable(
                name: "property_recommendations");
        }
    }
}
