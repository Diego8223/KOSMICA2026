package com.luxshop.repository;

import com.luxshop.model.GiftCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GiftCardRepository extends JpaRepository<GiftCard, Long> {

    Optional<GiftCard> findByCode(String code);

    // FIX: buscar por paymentId para el webhook de MercadoPago
    Optional<GiftCard> findByPaymentId(String paymentId);

    List<GiftCard> findBySenderEmailOrderByCreatedAtDesc(String senderEmail);

    List<GiftCard> findByRecipientEmailOrderByCreatedAtDesc(String recipientEmail);

    List<GiftCard> findAllByOrderByCreatedAtDesc();
}
