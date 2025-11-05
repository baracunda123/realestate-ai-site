using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexToPropertyLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "saved_searches");

            migrationBuilder.CreateIndex(
                name: "IX_properties_city",
                table: "properties",
                column: "city");

            migrationBuilder.CreateIndex(
                name: "IX_properties_city_type_price",
                table: "properties",
                columns: new[] { "city", "type", "price" });

            migrationBuilder.CreateIndex(
                name: "IX_properties_county",
                table: "properties",
                column: "county");

            migrationBuilder.CreateIndex(
                name: "IX_properties_createdAt",
                table: "properties",
                column: "createdAt");

            migrationBuilder.CreateIndex(
                name: "IX_properties_link",
                table: "properties",
                column: "link",
                unique: true,
                filter: "link IS NOT NULL AND link != ''");

            migrationBuilder.CreateIndex(
                name: "IX_properties_price",
                table: "properties",
                column: "price");

            migrationBuilder.CreateIndex(
                name: "IX_properties_source_site",
                table: "properties",
                column: "source_site");

            migrationBuilder.CreateIndex(
                name: "IX_properties_type",
                table: "properties",
                column: "type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_properties_city",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_city_type_price",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_county",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_createdAt",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_link",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_price",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_source_site",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_type",
                table: "properties");

            migrationBuilder.CreateTable(
                name: "saved_searches",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    bathrooms = table.Column<int>(type: "integer", nullable: true),
                    bedrooms = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    has_garage = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    last_executed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_viewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    max_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    min_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    new_results_count = table.Column<int>(type: "integer", nullable: false),
                    property_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    query = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    results_count = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_saved_searches", x => x.id);
                    table.ForeignKey(
                        name: "FK_saved_searches_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_saved_searches_created_at",
                table: "saved_searches",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_saved_searches_is_active",
                table: "saved_searches",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_saved_searches_user_id",
                table: "saved_searches",
                column: "user_id");
        }
    }
}
