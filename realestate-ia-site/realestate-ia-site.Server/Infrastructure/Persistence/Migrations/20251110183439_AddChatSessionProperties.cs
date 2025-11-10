using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChatSessionProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "property_alert_notifications");

            migrationBuilder.DropTable(
                name: "property_alerts");

            migrationBuilder.CreateTable(
                name: "ChatSessionProperties",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    SessionId = table.Column<string>(type: "text", nullable: false),
                    PropertyId = table.Column<string>(type: "text", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatSessionProperties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatSessionProperties_ChatSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ChatSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChatSessionProperties_properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "properties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessionProperties_PropertyId",
                table: "ChatSessionProperties",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessionProperties_SessionId",
                table: "ChatSessionProperties",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessionProperties_SessionId_DisplayOrder",
                table: "ChatSessionProperties",
                columns: new[] { "SessionId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessionProperties_SessionId_PropertyId",
                table: "ChatSessionProperties",
                columns: new[] { "SessionId", "PropertyId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChatSessionProperties");

            migrationBuilder.CreateTable(
                name: "property_alert_notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    property_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    alert_id = table.Column<Guid>(type: "uuid", nullable: false),
                    alert_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    old_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    property_location = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    property_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
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
                name: "property_alerts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    property_id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    alert_threshold_percentage = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    current_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    last_triggered = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notification_count = table.Column<int>(type: "integer", nullable: false),
                    property_location = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    property_title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_alerts", x => x.id);
                    table.ForeignKey(
                        name: "FK_property_alerts_properties_property_id",
                        column: x => x.property_id,
                        principalTable: "properties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_property_alerts_users_user_id",
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
                name: "IX_property_alerts_created_at",
                table: "property_alerts",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_property_alerts_is_active",
                table: "property_alerts",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_property_alerts_last_triggered",
                table: "property_alerts",
                column: "last_triggered");

            migrationBuilder.CreateIndex(
                name: "IX_property_alerts_property_id",
                table: "property_alerts",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_alerts_user_id",
                table: "property_alerts",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_alerts_user_id_property_id",
                table: "property_alerts",
                columns: new[] { "user_id", "property_id" },
                unique: true);
        }
    }
}
