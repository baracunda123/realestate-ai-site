using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyAlertsAndPriceHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PropertyAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Location = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PropertyType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MinPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    MaxPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Bedrooms = table.Column<int>(type: "integer", nullable: true),
                    Bathrooms = table.Column<int>(type: "integer", nullable: true),
                    EmailNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    SmsNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    PriceDropAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    NewListingAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastTriggered = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MatchCount = table.Column<int>(type: "integer", nullable: false),
                    NewMatches = table.Column<int>(type: "integer", nullable: false)
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
                    PropertyId = table.Column<Guid>(type: "uuid", nullable: false),
                    PropertyId1 = table.Column<string>(type: "text", nullable: false),
                    OldPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    NewPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ChangeReason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyPriceHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PropertyPriceHistories_properties_PropertyId1",
                        column: x => x.PropertyId1,
                        principalTable: "properties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PropertyAlerts_CreatedAt",
                table: "PropertyAlerts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyAlerts_IsActive",
                table: "PropertyAlerts",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyAlerts_UserId",
                table: "PropertyAlerts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyPriceHistories_ChangedAt",
                table: "PropertyPriceHistories",
                column: "ChangedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyPriceHistories_PropertyId",
                table: "PropertyPriceHistories",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyPriceHistories_PropertyId1",
                table: "PropertyPriceHistories",
                column: "PropertyId1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PropertyAlerts");

            migrationBuilder.DropTable(
                name: "PropertyPriceHistories");
        }
    }
}
