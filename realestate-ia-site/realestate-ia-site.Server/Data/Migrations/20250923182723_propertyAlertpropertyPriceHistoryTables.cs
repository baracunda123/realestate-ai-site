using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class propertyAlertpropertyPriceHistoryTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PropertyAlerts");

            migrationBuilder.DropTable(
                name: "PropertyPriceHistories");

            migrationBuilder.CreateTable(
                name: "property_alerts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    property_id = table.Column<string>(type: "text", nullable: false),
                    property_title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    property_location = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    current_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    alert_threshold_percentage = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_triggered = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notification_count = table.Column<int>(type: "integer", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "property_price_histories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    property_id = table.Column<string>(type: "text", nullable: false),
                    old_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    new_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    changed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    change_reason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_price_histories", x => x.id);
                    table.ForeignKey(
                        name: "FK_property_price_histories_properties_property_id",
                        column: x => x.property_id,
                        principalTable: "properties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

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

            migrationBuilder.CreateIndex(
                name: "IX_property_price_histories_changed_at",
                table: "property_price_histories",
                column: "changed_at");

            migrationBuilder.CreateIndex(
                name: "IX_property_price_histories_property_id",
                table: "property_price_histories",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_price_histories_property_id_changed_at",
                table: "property_price_histories",
                columns: new[] { "property_id", "changed_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "property_alerts");

            migrationBuilder.DropTable(
                name: "property_price_histories");

            migrationBuilder.CreateTable(
                name: "PropertyAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Bathrooms = table.Column<int>(type: "integer", nullable: true),
                    Bedrooms = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EmailNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastTriggered = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Location = table.Column<string>(type: "text", nullable: true),
                    MatchCount = table.Column<int>(type: "integer", nullable: false),
                    MaxPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    MinPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    NewListingAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    NewMatches = table.Column<int>(type: "integer", nullable: false),
                    PriceDropAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    PropertyType = table.Column<string>(type: "text", nullable: true),
                    SmsNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyAlerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PropertyPriceHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PropertyId = table.Column<string>(type: "text", nullable: false),
                    ChangeReason = table.Column<string>(type: "text", nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NewPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    OldPrice = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyPriceHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PropertyPriceHistories_properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "properties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PropertyPriceHistories_PropertyId",
                table: "PropertyPriceHistories",
                column: "PropertyId");
        }
    }
}
