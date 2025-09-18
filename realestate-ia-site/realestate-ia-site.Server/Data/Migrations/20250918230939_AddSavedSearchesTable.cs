using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSavedSearchesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "saved_searches",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    query = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    property_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    min_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    max_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    bedrooms = table.Column<int>(type: "integer", nullable: true),
                    bathrooms = table.Column<int>(type: "integer", nullable: true),
                    has_garage = table.Column<bool>(type: "boolean", nullable: false),
                    results_count = table.Column<int>(type: "integer", nullable: false),
                    new_results_count = table.Column<int>(type: "integer", nullable: false),
                    last_executed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_viewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "saved_searches");
        }
    }
}
